import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type {
  PileInfo,
  AcceptanceRecord,
  RectificationItem,
  CheckItem,
  PhotoItem,
  StepResult,
  AcceptanceStep,
  ProblemType,
  RectificationStatus,
  TimelineNode,
  TimelineNodeType,
  ArchivePackage
} from '@/types'
import { mockPiles, mockAcceptanceRecords, mockRectifications, checkItemTemplates } from '@/data/mock'
import { generateId, persistPhoto, persistPhotoBatch } from '@/utils'
import { AcceptanceStepMap, ProblemTypeMap } from '@/types'

const STORAGE_KEY = 'pile_acceptance_store_v1'

interface PersistData {
  piles: PileInfo[]
  acceptanceRecords: AcceptanceRecord[]
  rectifications: RectificationItem[]
  timelineNodes: TimelineNode[]
  archivePackages: ArchivePackage[]
  _persistedAt: string
}

const loadFromStorage = (): PersistData | null => {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as PersistData
      console.log('[Store] 从本地存储加载数据:', data._persistedAt)
      return data
    }
  } catch (e) {
    console.warn('[Store] 读取本地存储失败:', e)
  }
  return null
}

const saveToStorage = (data: PersistData) => {
  try {
    const payload: PersistData = {
      ...data,
      _persistedAt: new Date().toISOString()
    }
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(payload))
    console.log('[Store] 数据已保存到本地存储')
  } catch (e) {
    console.warn('[Store] 保存本地存储失败:', e)
  }
}

const buildInitialTimelineNodes = (
  piles: PileInfo[],
  records: AcceptanceRecord[],
  rects: RectificationItem[]
): TimelineNode[] => {
  const nodes: TimelineNode[] = []
  const stepsOrder: AcceptanceStep[] = ['beforeDrilling', 'reinforcementCage', 'pouring']

  piles.forEach(pile => {
    nodes.push({
      id: `init_create_${pile.id}`,
      type: 'create',
      pileId: pile.id,
      title: '桩号创建',
      description: `${pile.pileNo} · ${pile.projectName}`,
      time: pile.createTime,
      operator: '系统'
    })

    const record = records.find(r => r.pileId === pile.id)
    if (record) {
      stepsOrder.forEach(step => {
        const sr = record.steps[step]
        if (sr && sr.checked) {
          if (sr.photos.length > 0) {
            nodes.push({
              id: `init_photo_${pile.id}_${step}`,
              type: 'photo_save',
              pileId: pile.id,
              title: '现场照片留存',
              description: `${AcceptanceStepMap[step]} · ${sr.photos.length} 张照片已归档`,
              time: sr.checkTime,
              step,
              photoCount: sr.photos.length,
              operator: sr.inspector
            })
          }

          nodes.push({
            id: `init_step_${pile.id}_${step}`,
            type: 'step',
            pileId: pile.id,
            title: `${AcceptanceStepMap[step]}完成`,
            description: `检查项 ${sr.checkItems.filter(i => i.checked).length}/${sr.checkItems.length} 通过 · 结论：${sr.conclusion || '无'}`,
            time: sr.checkTime,
            step,
            operator: sr.inspector
          })
        }
      })
    }

    const pileRects = rects.filter(r => r.pileId === pile.id)
    pileRects.forEach(rect => {
      nodes.push({
        id: `init_rect_create_${rect.id}`,
        type: 'rect_create',
        pileId: pile.id,
        title: '生成整改单',
        description: `${AcceptanceStepMap[rect.step]} · ${ProblemTypeMap[rect.problemType as ProblemType] || rect.problemType}：${rect.problemDesc}`,
        time: rect.createTime,
        step: rect.step,
        rectId: rect.id,
        operator: '张监理'
      })

      if (rect.recheckTime && rect.recheckDesc) {
        if (rect.recheckPhotos.length > 0) {
          nodes.push({
            id: `init_rect_photo_${rect.id}`,
            type: 'photo_save',
            pileId: pile.id,
            title: '复查照片留存',
            description: `整改复查 · ${rect.recheckPhotos.length} 张照片已归档`,
            time: rect.recheckTime,
            step: rect.step,
            photoCount: rect.recheckPhotos.length,
            rectId: rect.id,
            operator: rect.handler
          })
        }

        nodes.push({
          id: `init_rect_recheck_${rect.id}`,
          type: 'rect_recheck',
          pileId: pile.id,
          title: '施工单位提交复查',
          description: rect.recheckDesc,
          time: rect.recheckTime,
          step: rect.step,
          rectId: rect.id,
          operator: rect.handler
        })
      }

      if (rect.status === 'closed' && rect.closeTime) {
        nodes.push({
          id: `init_rect_approve_${rect.id}`,
          type: 'rect_approve',
          pileId: pile.id,
          title: '复查通过，整改闭环',
          description: `监理确认整改合格`,
          time: rect.closeTime,
          step: rect.step,
          rectId: rect.id,
          operator: rect.closer
        })
      }

      if (rect.status === 'processing' && rect.rejectReason) {
        nodes.push({
          id: `init_rect_reject_${rect.id}`,
          type: 'rect_reject',
          pileId: pile.id,
          title: '复查驳回',
          description: `驳回原因：${rect.rejectReason}`,
          time: rect.recheckTime || rect.createTime,
          step: rect.step,
          rectId: rect.id,
          operator: '张监理'
        })
      }
    })

    if (pile.status === 'completed') {
      nodes.push({
        id: `init_complete_${pile.id}`,
        type: 'complete',
        pileId: pile.id,
        title: '验收完成',
        description: `${pile.pileNo} 全部验收环节已通过`,
        time: record?.updateTime || pile.createTime,
        operator: '系统'
      })
    }
  })

  return nodes.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

const initPersisted = () => {
  const stored = loadFromStorage()
  if (stored && stored.piles && stored.piles.length > 0) {
    return {
      piles: stored.piles,
      acceptanceRecords: stored.acceptanceRecords || [],
      rectifications: stored.rectifications || [],
      timelineNodes: stored.timelineNodes || [],
      archivePackages: stored.archivePackages || []
    }
  }
  console.log('[Store] 无有效本地数据，使用mock初始化')
  return {
    piles: [...mockPiles],
    acceptanceRecords: [...mockAcceptanceRecords],
    rectifications: [...mockRectifications],
    timelineNodes: buildInitialTimelineNodes(mockPiles, mockAcceptanceRecords, mockRectifications),
    archivePackages: []
  }
}

const addTimelineNode = (nodes: TimelineNode[], node: Omit<TimelineNode, 'id'>): TimelineNode[] => {
  const newNode: TimelineNode = {
    ...node,
    id: generateId()
  }
  return [...nodes, newNode].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

interface AcceptanceStore {
  piles: PileInfo[]
  acceptanceRecords: AcceptanceRecord[]
  rectifications: RectificationItem[]
  timelineNodes: TimelineNode[]
  archivePackages: ArchivePackage[]

  getPileById: (id: string) => PileInfo | undefined
  getRecordByPileId: (pileId: string) => AcceptanceRecord | undefined
  getRectificationById: (id: string) => RectificationItem | undefined
  getRectificationsByPileId: (pileId: string) => RectificationItem[]
  getTimelineByPileId: (pileId: string) => TimelineNode[]
  getArchivePackageByPileId: (pileId: string) => ArchivePackage | undefined

  initCheckItems: (step: AcceptanceStep, existing?: CheckItem[]) => CheckItem[]

  submitStepResult: (
    pileId: string,
    step: AcceptanceStep,
    checkItems: CheckItem[],
    photos: PhotoItem[],
    conclusion: string
  ) => Promise<void>

  createRectification: (
    pileId: string,
    step: AcceptanceStep,
    problemType: ProblemType,
    problemDesc: string,
    requirement: string
  ) => RectificationItem

  submitRecheck: (
    rectId: string,
    recheckDesc: string,
    recheckPhotos: PhotoItem[]
  ) => Promise<void>

  reviewRectification: (
    rectId: string,
    action: 'approve' | 'reject',
    comment?: string
  ) => void

  generateArchivePackage: (pileId: string) => ArchivePackage
  confirmArchivePackage: (packageId: string) => void

  refreshPiles: () => void
  clearStorage: () => void
}

const initial = initPersisted()

export const useAcceptanceStore = create<AcceptanceStore>((set, get) => ({
  piles: initial.piles,
  acceptanceRecords: initial.acceptanceRecords,
  rectifications: initial.rectifications,
  timelineNodes: initial.timelineNodes,
  archivePackages: initial.archivePackages,

  getPileById: (id) => get().piles.find(p => p.id === id),

  getRecordByPileId: (pileId) => get().acceptanceRecords.find(r => r.pileId === pileId),

  getRectificationById: (id) => get().rectifications.find(r => r.id === id),

  getRectificationsByPileId: (pileId) => get().rectifications.filter(r => r.pileId === pileId),

  getTimelineByPileId: (pileId) => get().timelineNodes.filter(n => n.pileId === pileId),

  getArchivePackageByPileId: (pileId) => get().archivePackages.find(p => p.pileId === pileId),

  initCheckItems: (step, existing) => {
    if (existing && existing.length > 0) {
      return existing.map(item => ({ ...item }))
    }
    const templates = checkItemTemplates[step]
    return templates.map(tpl => ({
      id: generateId(),
      key: tpl.key,
      label: tpl.label,
      step: tpl.step,
      checked: false
    }))
  },

  submitStepResult: async (pileId, step, checkItems, photos, conclusion) => {
    const { piles, acceptanceRecords, rectifications, timelineNodes } = get()
    const pile = piles.find(p => p.id === pileId)
    if (!pile) return

    console.log('[Store] 开始持久化验收照片...')
    const persistResults = await persistPhotoBatch(
      photos.map(p => ({ id: p.id, url: p.url, pileId, step }))
    )
    const persistedPhotos = photos.map(photo => {
      const result = persistResults.find(r => r.id === photo.id)
      return result ? { ...photo, url: result.savedUrl } : photo
    })
    console.log('[Store] 验收照片持久化完成，共', persistedPhotos.length, '张')

    const stepResult: StepResult = {
      step,
      checked: true,
      checkItems: [...checkItems],
      photos: persistedPhotos,
      conclusion,
      inspector: '张监理',
      checkTime: new Date().toISOString()
    }

    const stepsOrder: AcceptanceStep[] = ['beforeDrilling', 'reinforcementCage', 'pouring']
    const currentStepIndex = stepsOrder.indexOf(step)
    const isLastStep = currentStepIndex === stepsOrder.length - 1

    const updatedPiles = piles.map(p => {
      if (p.id !== pileId) return p
      if (isLastStep) {
        return { ...p, status: 'completed' as const, currentStep: null }
      }
      return { ...p, status: 'inProgress' as const, currentStep: stepsOrder[currentStepIndex + 1] }
    })

    let updatedRecords = [...acceptanceRecords]
    const existingRecordIndex = updatedRecords.findIndex(r => r.pileId === pileId)

    if (existingRecordIndex >= 0) {
      const existing = updatedRecords[existingRecordIndex]
      updatedRecords[existingRecordIndex] = {
        ...existing,
        steps: {
          ...existing.steps,
          [step]: stepResult
        },
        overallConclusion: isLastStep ? '验收合格' : existing.overallConclusion,
        updateTime: new Date().toISOString()
      }
    } else {
      const newRecord: AcceptanceRecord = {
        id: generateId(),
        pileId,
        pileNo: pile.pileNo,
        projectId: pile.projectId,
        steps: {
          beforeDrilling: step === 'beforeDrilling' ? stepResult : null,
          reinforcementCage: step === 'reinforcementCage' ? stepResult : null,
          pouring: step === 'pouring' ? stepResult : null
        },
        overallConclusion: isLastStep ? '验收合格' : '',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      updatedRecords.push(newRecord)
    }

    let newTimelineNodes = timelineNodes
    if (persistedPhotos.length > 0) {
      newTimelineNodes = addTimelineNode(newTimelineNodes, {
        type: 'photo_save',
        pileId,
        title: '现场照片留存',
        description: `${AcceptanceStepMap[step]} · ${persistedPhotos.length} 张照片已归档`,
        time: stepResult.checkTime,
        step,
        photoCount: persistedPhotos.length,
        operator: '张监理'
      })
    }

    newTimelineNodes = addTimelineNode(newTimelineNodes, {
      type: 'step',
      pileId,
      title: `${AcceptanceStepMap[step]}完成`,
      description: `检查项 ${checkItems.filter(i => i.checked).length}/${checkItems.length} 通过 · 结论：${conclusion || '无'}`,
      time: stepResult.checkTime,
      step,
      operator: '张监理'
    })

    if (isLastStep) {
      newTimelineNodes = addTimelineNode(newTimelineNodes, {
        type: 'complete',
        pileId,
        title: '验收完成',
        description: `${pile.pileNo} 全部验收环节已通过`,
        time: new Date().toISOString(),
        operator: '系统'
      })
    }

    set({ piles: updatedPiles, acceptanceRecords: updatedRecords, timelineNodes: newTimelineNodes })
    saveToStorage({ piles: updatedPiles, acceptanceRecords: updatedRecords, rectifications, timelineNodes: newTimelineNodes, archivePackages: get().archivePackages, _persistedAt: '' })
    console.log('[Store] 步骤验收完成:', { pileId, step, isLastStep })
  },

  createRectification: (pileId, step, problemType, problemDesc, requirement) => {
    const { piles, rectifications, acceptanceRecords, timelineNodes } = get()
    const pile = piles.find(p => p.id === pileId)
    if (!pile) throw new Error('桩号不存在')

    const newRect: RectificationItem = {
      id: generateId(),
      pileId,
      pileNo: pile.pileNo,
      projectId: pile.projectId,
      projectName: pile.projectName,
      step,
      problemType,
      problemDesc,
      requirement,
      status: 'processing' as RectificationStatus,
      createTime: new Date().toISOString(),
      deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      handler: '李施工',
      recheckPhotos: []
    }

    const updatedPiles = piles.map(p =>
      p.id === pileId ? { ...p, hasRectification: true } : p
    )
    const updatedRectifications = [newRect, ...rectifications]

    const newTimelineNodes = addTimelineNode(timelineNodes, {
      type: 'rect_create',
      pileId,
      title: '生成整改单',
      description: `${AcceptanceStepMap[step]} · ${ProblemTypeMap[problemType]}：${problemDesc}`,
      time: newRect.createTime,
      step,
      rectId: newRect.id,
      operator: '张监理'
    })

    set({
      piles: updatedPiles,
      rectifications: updatedRectifications,
      timelineNodes: newTimelineNodes
    })
    saveToStorage({ piles: updatedPiles, acceptanceRecords, rectifications: updatedRectifications, timelineNodes: newTimelineNodes, archivePackages: get().archivePackages, _persistedAt: '' })

    console.log('[Store] 生成整改单:', newRect.id)
    return newRect
  },

  submitRecheck: async (rectId, recheckDesc, recheckPhotos) => {
    const { rectifications, piles, acceptanceRecords, timelineNodes } = get()
    const rect = rectifications.find(r => r.id === rectId)
    if (!rect) return

    console.log('[Store] 开始持久化复查照片...')
    const persistResults = await persistPhotoBatch(
      recheckPhotos.map(p => ({ id: p.id, url: p.url, pileId: rect.pileId, step: rect.step }))
    )
    const persistedPhotos = recheckPhotos.map(photo => {
      const result = persistResults.find(r => r.id === photo.id)
      return result ? { ...photo, url: result.savedUrl } : photo
    })
    console.log('[Store] 复查照片持久化完成，共', persistedPhotos.length, '张')

    const updated = rectifications.map(r => {
      if (r.id !== rectId) return r
      return {
        ...r,
        status: 'rechecking' as RectificationStatus,
        recheckDesc,
        recheckTime: new Date().toISOString(),
        recheckPhotos: persistedPhotos
      }
    })

    let newTimelineNodes = timelineNodes
    if (persistedPhotos.length > 0) {
      newTimelineNodes = addTimelineNode(newTimelineNodes, {
        type: 'photo_save',
        pileId: rect.pileId,
        title: '复查照片留存',
        description: `整改复查 · ${persistedPhotos.length} 张照片已归档`,
        time: new Date().toISOString(),
        step: rect.step,
        photoCount: persistedPhotos.length,
        rectId,
        operator: rect.handler
      })
    }

    newTimelineNodes = addTimelineNode(newTimelineNodes, {
      type: 'rect_recheck',
      pileId: rect.pileId,
      title: '施工单位提交复查',
      description: recheckDesc,
      time: new Date().toISOString(),
      step: rect.step,
      rectId,
      operator: rect.handler
    })

    set({ rectifications: updated, timelineNodes: newTimelineNodes })
    saveToStorage({ piles, acceptanceRecords, rectifications: updated, timelineNodes: newTimelineNodes, archivePackages: get().archivePackages, _persistedAt: '' })
    console.log('[Store] 施工单位提交复查:', rectId)
  },

  reviewRectification: (rectId, action, comment) => {
    const { rectifications, piles: currentPiles, acceptanceRecords, timelineNodes } = get()

    const targetRect = rectifications.find(x => x.id === rectId)
    if (!targetRect) return

    const updated = rectifications.map(r => {
      if (r.id !== rectId) return r

      if (action === 'approve') {
        return {
          ...r,
          status: 'closed' as RectificationStatus,
          closeTime: new Date().toISOString(),
          closer: '张监理'
        }
      } else {
        return {
          ...r,
          status: 'processing' as RectificationStatus,
          rejectReason: comment,
          recheckDesc: undefined,
          recheckTime: undefined,
          recheckPhotos: []
        }
      }
    })

    const remaining = updated.filter(
      r => r.pileId === targetRect.pileId && r.status !== 'closed'
    ).length

    let finalPiles = currentPiles
    if (action === 'approve' && remaining === 0) {
      finalPiles = currentPiles.map(p =>
        p.id === targetRect.pileId ? { ...p, hasRectification: false } : p
      )
    }

    let newTimelineNodes = timelineNodes
    if (action === 'approve') {
      newTimelineNodes = addTimelineNode(newTimelineNodes, {
        type: 'rect_approve',
        pileId: targetRect.pileId,
        title: '复查通过，整改闭环',
        description: `监理确认整改合格`,
        time: new Date().toISOString(),
        step: targetRect.step,
        rectId,
        operator: '张监理'
      })
    } else {
      newTimelineNodes = addTimelineNode(newTimelineNodes, {
        type: 'rect_reject',
        pileId: targetRect.pileId,
        title: '复查驳回',
        description: `驳回原因：${comment || '需继续整改'}`,
        time: new Date().toISOString(),
        step: targetRect.step,
        rectId,
        operator: '张监理'
      })
    }

    set({ piles: finalPiles, rectifications: updated, timelineNodes: newTimelineNodes })
    saveToStorage({ piles: finalPiles, acceptanceRecords, rectifications: updated, timelineNodes: newTimelineNodes, archivePackages: get().archivePackages, _persistedAt: '' })
    console.log('[Store] 监理复查:', { rectId, action })
  },

  generateArchivePackage: (pileId) => {
    const { piles, acceptanceRecords, rectifications, timelineNodes, archivePackages } = get()
    const pile = piles.find(p => p.id === pileId)
    if (!pile) throw new Error('桩号不存在')

    const record = acceptanceRecords.find(r => r.pileId === pileId)
    const pileRects = rectifications.filter(r => r.pileId === pileId)

    const steps = record?.steps || { beforeDrilling: null, reinforcementCage: null, pouring: null }
    const allSteps = [steps.beforeDrilling, steps.reinforcementCage, steps.pouring].filter(Boolean) as StepResult[]
    const totalCheckItems = allSteps.reduce((sum, s) => sum + s.checkItems.length, 0)
    const passedCheckItems = allSteps.reduce((sum, s) => sum + s.checkItems.filter(i => i.checked).length, 0)
    const totalPhotos = allSteps.reduce((sum, s) => sum + s.photos.length, 0) +
      pileRects.reduce((sum, r) => sum + r.recheckPhotos.length, 0)

    const existingPkgIndex = archivePackages.findIndex(p => p.pileId === pileId)
    const newPkg: ArchivePackage = {
      id: existingPkgIndex >= 0 ? archivePackages[existingPkgIndex].id : generateId(),
      pileId,
      pileNo: pile.pileNo,
      projectId: pile.projectId,
      projectName: pile.projectName,
      steps,
      rectifications: pileRects,
      overallConclusion: record?.overallConclusion || (pile.status === 'completed' ? '验收合格' : '验收中'),
      generateTime: new Date().toISOString(),
      confirmed: existingPkgIndex >= 0 ? archivePackages[existingPkgIndex].confirmed : false,
      confirmTime: existingPkgIndex >= 0 ? archivePackages[existingPkgIndex].confirmTime : undefined,
      confirmer: existingPkgIndex >= 0 ? archivePackages[existingPkgIndex].confirmer : undefined,
      totalPhotos,
      totalCheckItems,
      passedCheckItems,
      rectificationCount: pileRects.length,
      closedRectificationCount: pileRects.filter(r => r.status === 'closed').length
    }

    let updatedPackages = [...archivePackages]
    if (existingPkgIndex >= 0) {
      updatedPackages[existingPkgIndex] = newPkg
    } else {
      updatedPackages.push(newPkg)
    }

    const newTimelineNodes = addTimelineNode(timelineNodes, {
      type: 'archive_generate',
      pileId,
      title: '生成验收资料包',
      description: `检查项 ${passedCheckItems}/${totalCheckItems} · 照片 ${totalPhotos} 张 · 整改 ${pileRects.length} 条`,
      time: newPkg.generateTime,
      operator: '张监理'
    })

    set({ archivePackages: updatedPackages, timelineNodes: newTimelineNodes })
    saveToStorage({ piles, acceptanceRecords, rectifications, timelineNodes: newTimelineNodes, archivePackages: updatedPackages, _persistedAt: '' })
    console.log('[Store] 生成资料包:', newPkg.id)
    return newPkg
  },

  confirmArchivePackage: (packageId) => {
    const { archivePackages, timelineNodes, piles, acceptanceRecords, rectifications } = get()
    const pkgIndex = archivePackages.findIndex(p => p.id === packageId)
    if (pkgIndex < 0) return

    const updatedPackages = archivePackages.map((p, idx) => {
      if (idx !== pkgIndex) return p
      return {
        ...p,
        confirmed: true,
        confirmTime: new Date().toISOString(),
        confirmer: '张监理'
      }
    })

    const targetPkg = updatedPackages[pkgIndex]
    const newTimelineNodes = addTimelineNode(timelineNodes, {
      type: 'archive_confirm',
      pileId: targetPkg.pileId,
      title: '归档确认完成',
      description: `资料包已由 ${targetPkg.confirmer} 确认归档`,
      time: targetPkg.confirmTime!,
      operator: targetPkg.confirmer
    })

    set({ archivePackages: updatedPackages, timelineNodes: newTimelineNodes })
    saveToStorage({ piles, acceptanceRecords, rectifications, timelineNodes: newTimelineNodes, archivePackages: updatedPackages, _persistedAt: '' })
    console.log('[Store] 资料包归档确认:', packageId)
  },

  refreshPiles: () => {
    const { piles } = get()
    set({ piles: [...piles] })
    console.log('[Store] 刷新桩号列表')
  },

  clearStorage: () => {
    try {
      Taro.removeStorageSync(STORAGE_KEY)
      console.log('[Store] 本地存储已清除')
    } catch (e) {
      console.warn('[Store] 清除本地存储失败:', e)
    }
    const freshNodes = buildInitialTimelineNodes(mockPiles, mockAcceptanceRecords, mockRectifications)
    set({
      piles: [...mockPiles],
      acceptanceRecords: [...mockAcceptanceRecords],
      rectifications: [...mockRectifications],
      timelineNodes: freshNodes,
      archivePackages: []
    })
    saveToStorage({
      piles: [...mockPiles],
      acceptanceRecords: [...mockAcceptanceRecords],
      rectifications: [...mockRectifications],
      timelineNodes: freshNodes,
      archivePackages: [],
      _persistedAt: ''
    })
  }
}))

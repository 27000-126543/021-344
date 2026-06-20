import { create } from 'zustand'
import type {
  PileInfo,
  AcceptanceRecord,
  RectificationItem,
  CheckItem,
  PhotoItem,
  StepResult,
  AcceptanceStep,
  ProblemType,
  RectificationStatus
} from '@/types'
import { mockPiles, mockAcceptanceRecords, mockRectifications, checkItemTemplates } from '@/data/mock'
import { generateId } from '@/utils'

interface AcceptanceStore {
  piles: PileInfo[]
  acceptanceRecords: AcceptanceRecord[]
  rectifications: RectificationItem[]

  getPileById: (id: string) => PileInfo | undefined
  getRecordByPileId: (pileId: string) => AcceptanceRecord | undefined
  getRectificationById: (id: string) => RectificationItem | undefined
  getRectificationsByPileId: (pileId: string) => RectificationItem[]

  initCheckItems: (step: AcceptanceStep, existing?: CheckItem[]) => CheckItem[]

  submitStepResult: (
    pileId: string,
    step: AcceptanceStep,
    checkItems: CheckItem[],
    photos: PhotoItem[],
    conclusion: string
  ) => void

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
  ) => void

  reviewRectification: (
    rectId: string,
    action: 'approve' | 'reject',
    comment?: string
  ) => void

  refreshPiles: () => void
}

export const useAcceptanceStore = create<AcceptanceStore>((set, get) => ({
  piles: [...mockPiles],
  acceptanceRecords: [...mockAcceptanceRecords],
  rectifications: [...mockRectifications],

  getPileById: (id) => get().piles.find(p => p.id === id),

  getRecordByPileId: (pileId) => get().acceptanceRecords.find(r => r.pileId === pileId),

  getRectificationById: (id) => get().rectifications.find(r => r.id === id),

  getRectificationsByPileId: (pileId) => get().rectifications.filter(r => r.pileId === pileId),

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

  submitStepResult: (pileId, step, checkItems, photos, conclusion) => {
    const { piles, acceptanceRecords } = get()
    const pile = piles.find(p => p.id === pileId)
    if (!pile) return

    const stepResult: StepResult = {
      step,
      checked: true,
      checkItems: [...checkItems],
      photos: [...photos],
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

    set({ piles: updatedPiles, acceptanceRecords: updatedRecords })
    console.log('[Store] 步骤验收完成:', { pileId, step, isLastStep })
  },

  createRectification: (pileId, step, problemType, problemDesc, requirement) => {
    const { piles, rectifications } = get()
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

    set({
      piles: updatedPiles,
      rectifications: [newRect, ...rectifications]
    })

    console.log('[Store] 生成整改单:', newRect.id)
    return newRect
  },

  submitRecheck: (rectId, recheckDesc, recheckPhotos) => {
    const { rectifications } = get()

    const updated = rectifications.map(r => {
      if (r.id !== rectId) return r
      return {
        ...r,
        status: 'rechecking' as RectificationStatus,
        recheckDesc,
        recheckTime: new Date().toISOString(),
        recheckPhotos: [...recheckPhotos]
      }
    })

    set({ rectifications: updated })
    console.log('[Store] 施工单位提交复查:', rectId)
  },

  reviewRectification: (rectId, action, comment) => {
    const { rectifications } = get()

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

    const closedCount = updated.filter(r => r.status === 'closed').length
    const remaining = updated.filter(
      r => r.pileId === updated.find(x => x.id === rectId)?.pileId && r.status !== 'closed'
    ).length

    if (action === 'approve' && remaining === 0) {
      const rectPileId = updated.find(x => x.id === rectId)?.pileId
      if (rectPileId) {
        const { piles } = get()
        const updatedPiles = piles.map(p =>
          p.id === rectPileId ? { ...p, hasRectification: false } : p
        )
        set({ piles: updatedPiles })
      }
    }

    set({ rectifications: updated })
    console.log('[Store] 监理复查:', { rectId, action, closedCount })
  },

  refreshPiles: () => {
    const { piles } = get()
    set({ piles: [...piles] })
    console.log('[Store] 刷新桩号列表')
  }
}))

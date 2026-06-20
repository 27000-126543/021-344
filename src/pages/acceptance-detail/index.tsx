import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Textarea, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StepPanel from '@/components/StepPanel'
import StatusTag from '@/components/StatusTag'
import { useAcceptanceStore } from '@/store'
import type {
  AcceptanceStep,
  CheckItem,
  PhotoItem,
  ProblemType,
  ArchivePackage,
  StepResult,
  RectificationItem
} from '@/types'
import { AcceptanceStatusMap, AcceptanceStepMap, ProblemTypeMap, RectificationStatusMap } from '@/types'
import { resolvePhotoUrl, formatTime } from '@/utils'

const steps: Array<{ key: AcceptanceStep; label: string; photoCategory: string }> = [
  { key: 'beforeDrilling', label: '成孔前复核', photoCategory: '孔口标识' },
  { key: 'reinforcementCage', label: '钢筋笼验收', photoCategory: '钢筋笼焊接' },
  { key: 'pouring', label: '灌注旁站', photoCategory: '导管埋深' }
]

const problemTypes: ProblemType[] = [
  'holeDeviation',
  'cageLengthShort',
  'collapseRisk',
  'weldingQuality',
  'conduitDepth',
  'other'
]

const AcceptanceDetailPage: React.FC = () => {
  const router = useRouter()
  const pileId = router.params.id || 'pile001'

  const {
    piles,
    acceptanceRecords,
    rectifications,
    archivePackages,
    getPileById,
    getRecordByPileId,
    getRectificationsByPileId,
    getArchivePackageByPileId,
    initCheckItems,
    submitStepResult,
    createRectification,
    generateArchivePackage,
    confirmArchivePackage
  } = useAcceptanceStore()

  const pile = useMemo(() => getPileById(pileId), [getPileById, pileId, piles])
  const record = useMemo(() => getRecordByPileId(pileId), [getRecordByPileId, pileId, acceptanceRecords])
  const pileRectifications = useMemo(() => getRectificationsByPileId(pileId), [getRectificationsByPileId, pileId, rectifications])
  const existingPkg = useMemo(() => getArchivePackageByPileId(pileId), [getArchivePackageByPileId, pileId, archivePackages])

  const [activeTab, setActiveTab] = useState<'acceptance' | 'summary'>('acceptance')
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [currentPkg, setCurrentPkg] = useState<ArchivePackage | null>(null)
  const [expandedStep, setExpandedStep] = useState<AcceptanceStep | null>(null)
  const [initialized, setInitialized] = useState(false)

  const [stepCheckItems, setStepCheckItems] = useState<Record<AcceptanceStep, CheckItem[]>>({
    beforeDrilling: [],
    reinforcementCage: [],
    pouring: []
  })
  const [stepPhotos, setStepPhotos] = useState<Record<AcceptanceStep, PhotoItem[]>>({
    beforeDrilling: [],
    reinforcementCage: [],
    pouring: []
  })
  const [stepConclusions, setStepConclusions] = useState<Record<AcceptanceStep, string>>({
    beforeDrilling: '',
    reinforcementCage: '',
    pouring: ''
  })

  const [showProblemModal, setShowProblemModal] = useState(false)
  const [selectedProblemType, setSelectedProblemType] = useState<ProblemType | ''>('')
  const [problemDesc, setProblemDesc] = useState('')
  const [rectRequirement, setRectRequirement] = useState('')
  const [currentProblemStep, setCurrentProblemStep] = useState<AcceptanceStep>('beforeDrilling')

  const loadData = (resetLocalEdits = true) => {
    const currentPile = getPileById(pileId)
    const currentRecord = getRecordByPileId(pileId)

    const items: Record<AcceptanceStep, CheckItem[]> = {
      beforeDrilling: [],
      reinforcementCage: [],
      pouring: []
    }
    const photos: Record<AcceptanceStep, PhotoItem[]> = {
      beforeDrilling: [],
      reinforcementCage: [],
      pouring: []
    }
    const conclusions: Record<AcceptanceStep, string> = {
      beforeDrilling: '',
      reinforcementCage: '',
      pouring: ''
    }

    steps.forEach(s => {
      if (currentRecord?.steps[s.key]) {
        items[s.key] = [...(currentRecord.steps[s.key]?.checkItems || [])]
        photos[s.key] = [...(currentRecord.steps[s.key]?.photos || [])]
        conclusions[s.key] = currentRecord.steps[s.key]?.conclusion || ''
      } else {
        items[s.key] = initCheckItems(s.key)
      }
    })

    if (resetLocalEdits) {
      setStepCheckItems(items)
      setStepPhotos(photos)
      setStepConclusions(conclusions)
    } else {
      setStepCheckItems(prev => {
        const merged = { ...prev }
        steps.forEach(s => {
          if (currentRecord?.steps[s.key]) {
            merged[s.key] = [...(currentRecord.steps[s.key]?.checkItems || [])]
          } else if (!prev[s.key] || prev[s.key].length === 0) {
            merged[s.key] = initCheckItems(s.key)
          }
        })
        return merged
      })
      setStepPhotos(prev => {
        const merged = { ...prev }
        steps.forEach(s => {
          if (currentRecord?.steps[s.key]) {
            merged[s.key] = [...(currentRecord.steps[s.key]?.photos || [])]
          }
        })
        return merged
      })
      setStepConclusions(prev => {
        const merged = { ...prev }
        steps.forEach(s => {
          if (currentRecord?.steps[s.key]) {
            merged[s.key] = currentRecord.steps[s.key]?.conclusion || ''
          }
        })
        return merged
      })
    }

    if (currentPile?.currentStep) {
      setExpandedStep(currentPile.currentStep)
    } else if (currentPile?.status === 'pending') {
      setExpandedStep('beforeDrilling')
    } else if (currentPile?.status === 'completed') {
      setExpandedStep(null)
    }

    setInitialized(true)
    console.log('[AcceptanceDetail] 加载数据完成:', pileId, '状态:', currentPile?.status, 'resetLocalEdits:', resetLocalEdits)
  }

  useEffect(() => {
    loadData(true)

    const tabParam = router.params.tab
    if (tabParam === 'summary') {
      setActiveTab('summary')
    }

    const stepParam = router.params.step as AcceptanceStep
    if (stepParam) {
      setExpandedStep(stepParam)
    }

    const openArchive = router.params.openArchive
    if (openArchive === '1') {
      setTimeout(() => {
        handlePreviewArchive()
      }, 300)
    }
  }, [pileId])

  useDidShow(() => {
    loadData(false)
    console.log('[AcceptanceDetail] 页面显示，合并同步已提交数据')
  })

  const isStepCompleted = (stepKey: AcceptanceStep) => {
    return record?.steps[stepKey]?.checked ?? false
  }

  const handleCheckItemsChange = (stepKey: AcceptanceStep, items: CheckItem[]) => {
    setStepCheckItems(prev => ({
      ...prev,
      [stepKey]: items
    }))
  }

  const handlePhotosChange = (stepKey: AcceptanceStep, photos: PhotoItem[]) => {
    setStepPhotos(prev => ({
      ...prev,
      [stepKey]: photos
    }))
  }

  const handleConclusionChange = (stepKey: AcceptanceStep, conclusion: string) => {
    setStepConclusions(prev => ({
      ...prev,
      [stepKey]: conclusion
    }))
  }

  const handleSubmitStep = (stepKey: AcceptanceStep) => {
    const items = stepCheckItems[stepKey]
    const allChecked = items.length > 0 && items.every(i => i.checked)
    const hasPhotos = stepPhotos[stepKey].length > 0
    const hasConclusion = stepConclusions[stepKey].trim().length > 0

    if (!allChecked) {
      Taro.showToast({ title: '请完成所有检查项', icon: 'none' })
      return
    }
    if (!hasPhotos) {
      Taro.showToast({ title: '请上传现场照片', icon: 'none' })
      return
    }
    if (!hasConclusion) {
      Taro.showToast({ title: '请填写检查结论', icon: 'none' })
      return
    }

    submitStepResult(
      pileId,
      stepKey,
      items,
      stepPhotos[stepKey],
      stepConclusions[stepKey]
    )

    const stepIndex = steps.findIndex(s => s.key === stepKey)
    const isLastStep = stepIndex === steps.length - 1

    if (isLastStep) {
      setExpandedStep(null)
      Taro.showToast({ title: '验收全部完成', icon: 'success' })
    } else {
      const nextStep = steps[stepIndex + 1].key
      setExpandedStep(nextStep)
      setStepCheckItems(prev => ({
        ...prev,
        [nextStep]: initCheckItems(nextStep)
      }))
      Taro.showToast({ title: `${AcceptanceStepMap[stepKey]}验收完成`, icon: 'success' })
    }
  }

  const handleReportProblem = (stepKey: AcceptanceStep) => {
    setCurrentProblemStep(stepKey)
    setSelectedProblemType('')
    setProblemDesc('')
    setRectRequirement('')
    setShowProblemModal(true)
  }

  const handleSubmitRectification = () => {
    if (!selectedProblemType) {
      Taro.showToast({ title: '请选择问题类型', icon: 'none' })
      return
    }
    if (!problemDesc.trim()) {
      Taro.showToast({ title: '请输入问题描述', icon: 'none' })
      return
    }
    if (!rectRequirement.trim()) {
      Taro.showToast({ title: '请输入整改要求', icon: 'none' })
      return
    }

    try {
      const newRect = createRectification(
        pileId,
        currentProblemStep,
        selectedProblemType,
        problemDesc,
        rectRequirement
      )

      Taro.showToast({ title: '整改单已生成', icon: 'success' })
      setShowProblemModal(false)

      console.log('[AcceptanceDetail] 生成整改单:', newRect.id, '问题类型:', selectedProblemType)
    } catch (e) {
      console.error('[AcceptanceDetail] 生成整改单失败:', e)
      Taro.showToast({ title: '生成失败', icon: 'none' })
    }
  }

  const handleGenerateArchive = () => {
    try {
      const pkg = generateArchivePackage(pileId)
      setCurrentPkg(pkg)
      setShowArchiveModal(true)
      Taro.showToast({ title: '资料包已生成', icon: 'success' })
      console.log('[AcceptanceDetail] 生成资料包:', pkg.id)
    } catch (e) {
      console.error('[AcceptanceDetail] 生成资料包失败:', e)
      Taro.showToast({ title: '生成失败', icon: 'none' })
    }
  }

  const handlePreviewArchive = () => {
    if (existingPkg) {
      setCurrentPkg(existingPkg)
      setShowArchiveModal(true)
    } else {
      handleGenerateArchive()
    }
  }

  const handleConfirmArchive = () => {
    if (!currentPkg) return
    Taro.showModal({
      title: '确认归档',
      content: '确认后将标记该桩号资料已归档，归档后可在流转记录中查看',
      success: (res) => {
        if (res.confirm) {
          confirmArchivePackage(currentPkg.id)
          setCurrentPkg({ ...currentPkg, confirmed: true, confirmTime: new Date().toISOString(), confirmer: '张监理' })
          Taro.showToast({ title: '已确认归档', icon: 'success' })
        }
      }
    })
  }

  const canSubmitCurrentStep = () => {
    if (!expandedStep || !pile) return false
    if (isStepCompleted(expandedStep)) return false

    const stepIndex = steps.findIndex(s => s.key === expandedStep)
    const currentIndex = pile.status === 'pending' ? 0 : steps.findIndex(s => s.key === pile.currentStep)

    return stepIndex <= currentIndex
  }

  if (!pile || !initialized) {
    return (
      <View className={styles.page}>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      <ScrollView scrollY style={{ height: '100vh' }}>
        {pile.status === 'completed' && (
          <View className={styles.successBanner}>
            <Text className={styles.successIcon}>✅</Text>
            <Text className={styles.successText}>本桩号已完成全部验收</Text>
          </View>
        )}

        <View className={styles.pileInfoCard}>
          <View className={styles.pileHeader}>
            <Text className={styles.pileNo}>{pile.pileNo}</Text>
            <StatusTag status={pile.status} text={AcceptanceStatusMap[pile.status]} />
          </View>
          <View className={styles.pileMeta}>
            <View className={styles.metaItem}>
              <Text className={styles.label}>桩型：</Text>
              <Text>{pile.pileType}</Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.label}>设计桩长：</Text>
              <Text>{pile.designLength}m</Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.label}>桩径：</Text>
              <Text>{pile.designDiameter}mm</Text>
            </View>
          </View>
          <View className={styles.projectName}>{pile.projectName}</View>
        </View>

        <View className={styles.tabBar}>
          <View
            className={classnames(styles.tabItem, { [styles.active]: activeTab === 'acceptance' })}
            onClick={() => setActiveTab('acceptance')}
          >
            验收流程
          </View>
          <View
            className={classnames(styles.tabItem, { [styles.active]: activeTab === 'summary' })}
            onClick={() => setActiveTab('summary')}
          >
            资料汇总
          </View>
        </View>

        {activeTab === 'acceptance' && (
          <View className={styles.stepsSection}>
            <Text className={styles.sectionTitle}>验收步骤</Text>

            {steps.map((step, index) => {
              const isCompleted = isStepCompleted(step.key)
              const result = record?.steps[step.key] || null

              return (
                <StepPanel
                  key={step.key}
                  stepNumber={index + 1}
                  stepKey={step.key}
                  title={step.label}
                  result={result}
                  checkItems={stepCheckItems[step.key]}
                  photos={stepPhotos[step.key]}
                  conclusion={stepConclusions[step.key]}
                  pileId={pileId}
                  photoCategory={step.photoCategory}
                  expanded={expandedStep === step.key}
                  readonly={isCompleted}
                  onToggle={() =>
                    setExpandedStep(expandedStep === step.key ? null : step.key)
                  }
                  onCheckChange={(items) => handleCheckItemsChange(step.key, items)}
                  onPhotosChange={(photos) => handlePhotosChange(step.key, photos)}
                  onConclusionChange={(text) => handleConclusionChange(step.key, text)}
                />
              )
            })}
          </View>
        )}

        {activeTab === 'summary' && (
          <View className={styles.summarySection}>
            <View className={styles.archiveActionBar}>
              <View
                className={classnames(styles.btn, styles.btnOutline, styles.smallBtn)}
                onClick={handleGenerateArchive}
              >
                {existingPkg ? '重新生成资料包' : '一键生成资料包'}
              </View>
              <View
                className={classnames(styles.btn, styles.btnPrimary, styles.smallBtn)}
                onClick={handlePreviewArchive}
              >
                {existingPkg?.confirmed ? '查看归档资料' : '预览资料包'}
              </View>
            </View>

            {existingPkg && (
              <View className={styles.archiveStatusCard}>
                <View className={styles.archiveStatusInfo}>
                  <Text className={styles.archiveStatusTitle}>
                    {existingPkg.confirmed ? '✅ 已完成归档' : '📦 资料包已生成'}
                  </Text>
                  <Text className={styles.archiveStatusMeta}>
                    生成时间：{formatTime(existingPkg.generateTime)}
                    {existingPkg.confirmed && existingPkg.confirmTime && ` · 归档：${formatTime(existingPkg.confirmTime)}`}
                  </Text>
                </View>
                <View className={styles.archiveStatsMini}>
                  <View className={styles.statMini}>
                    <Text className={styles.statMiniValue}>{existingPkg.passedCheckItems}/{existingPkg.totalCheckItems}</Text>
                    <Text className={styles.statMiniLabel}>检查项</Text>
                  </View>
                  <View className={styles.statMini}>
                    <Text className={styles.statMiniValue}>{existingPkg.totalPhotos}</Text>
                    <Text className={styles.statMiniLabel}>张照片</Text>
                  </View>
                  <View className={styles.statMini}>
                    <Text className={styles.statMiniValue}>{existingPkg.closedRectificationCount}/{existingPkg.rectificationCount}</Text>
                    <Text className={styles.statMiniLabel}>整改</Text>
                  </View>
                </View>
              </View>
            )}

            {steps.map((step, index) => {
              const result = record?.steps[step.key] || null
              const isCompleted = result?.checked ?? false
              const stepRects = pileRectifications.filter(r => r.step === step.key)
              const displayPhotos = result?.photos || []
              const showPhotos = displayPhotos.slice(0, 8)

              return (
                <View key={step.key} className={styles.stepSummaryCard}>
                  <View className={styles.cardHeader}>
                    <Text className={styles.stepTitle}>
                      第{index + 1}步 · {step.label}
                    </Text>
                    <Text className={styles.stepStatus}>
                      {isCompleted ? '已完成' : '待验收'}
                    </Text>
                  </View>

                  <View className={styles.cardBody}>
                    {!isCompleted ? (
                      <View className={styles.emptyState}>本环节尚未完成验收</View>
                    ) : (
                      <>
                        <View className={styles.summaryBlock}>
                          <Text className={styles.blockTitle}>检查项</Text>
                          <View className={styles.checkItemsList}>
                            {result?.checkItems?.map(item => (
                              <View key={item.id} className={styles.checkItem}>
                                <Text className={item.checked ? styles.checkIcon : styles.uncheckIcon}>
                                  {item.checked ? '✓' : '○'}
                                </Text>
                                <Text>{item.label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        <View className={styles.summaryBlock}>
                          <Text className={styles.blockTitle}>检查结论</Text>
                          <View className={styles.conclusionText}>
                            {result?.conclusion || '无'}
                          </View>
                        </View>

                        <View className={styles.summaryBlock}>
                          <Text className={styles.blockTitle}>
                            现场照片 ({displayPhotos.length}张)
                          </Text>
                          {displayPhotos.length === 0 ? (
                            <View className={styles.emptyState}>暂无照片</View>
                          ) : (
                            <View className={styles.photoGrid}>
                              {showPhotos.map(photo => (
                                <View
                                  key={photo.id}
                                  className={styles.photoItem}
                                  onClick={() => {
                                    Taro.previewImage({
                                      current: resolvePhotoUrl(photo.url),
                                      urls: displayPhotos.map(p => resolvePhotoUrl(p.url))
                                    })
                                  }}
                                >
                                  <Image
                                    src={resolvePhotoUrl(photo.url)}
                                    mode='aspectFill'
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </View>
                              ))}
                              {displayPhotos.length > 8 && (
                                <View className={styles.photoCount}>
                                  +{displayPhotos.length - 8}
                                </View>
                              )}
                            </View>
                          )}
                        </View>

                        {stepRects.length > 0 && (
                          <View className={styles.summaryBlock}>
                            <Text className={styles.blockTitle}>
                              整改记录 ({stepRects.length}条)
                            </Text>
                            {stepRects.map(rect => (
                              <View key={rect.id} className={styles.rectItem}>
                                <Text className={styles.rectType}>
                                  {ProblemTypeMap[rect.problemType as ProblemType] || rect.problemType}
                                </Text>
                                <Text className={styles.rectDesc}>
                                  {rect.problemDesc}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View className={styles.inspectorRow}>
                          <Text>监理：{result?.inspector || '-'}</Text>
                          <Text>{result?.checkTime ? formatTime(result.checkTime) : '-'}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <View style={{ height: '200rpx' }} />
      </ScrollView>

      {activeTab === 'acceptance' && expandedStep && !isStepCompleted(expandedStep) && canSubmitCurrentStep() && (
        <View className={styles.bottomBar}>
          <View
            className={classnames(styles.btn, styles.btnSecondary)}
            onClick={() => handleReportProblem(expandedStep)}
          >
            发现问题
          </View>
          <View
            className={classnames(styles.btn, styles.btnPrimary)}
            onClick={() => handleSubmitStep(expandedStep)}
          >
            提交{AcceptanceStepMap[expandedStep]}
          </View>
        </View>
      )}

      {showProblemModal && (
        <View className={styles.modalMask} onClick={() => setShowProblemModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>上报问题 / 生成整改单</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>问题类型
              </Text>
              <View className={styles.problemTypeList}>
                {problemTypes.map(type => (
                  <View
                    key={type}
                    className={classnames(styles.problemTypeItem, {
                      [styles.active]: selectedProblemType === type
                    })}
                    onClick={() => setSelectedProblemType(type)}
                  >
                    {ProblemTypeMap[type]}
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>问题描述
              </Text>
              <Textarea
                className={styles.formTextarea}
                placeholder='请详细描述发现的问题...'
                value={problemDesc}
                onInput={(e) => setProblemDesc(e.detail.value)}
                maxlength={500}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>
                <Text className={styles.required}>*</Text>整改要求
              </Text>
              <Textarea
                className={styles.formTextarea}
                placeholder='请输入整改要求和期限...'
                value={rectRequirement}
                onInput={(e) => setRectRequirement(e.detail.value)}
                maxlength={500}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>关联环节</Text>
              <View
                style={{
                  padding: '16rpx 24rpx',
                  backgroundColor: '#f5f7fa',
                  borderRadius: '8rpx',
                  fontSize: '28rpx',
                  color: '#4e5969'
                }}
              >
                {AcceptanceStepMap[currentProblemStep]}
              </View>
            </View>

            <View className={styles.modalActions}>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnCancel)}
                onClick={() => setShowProblemModal(false)}
              >
                取消
              </View>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnConfirm)}
                onClick={handleSubmitRectification}
              >
                生成整改单
              </View>
            </View>
          </View>
        </View>
      )}

      {showArchiveModal && currentPkg && (
        <View className={styles.modalMask} onClick={() => setShowArchiveModal(false)}>
          <View className={classnames(styles.modalContent, styles.archiveModal)} onClick={(e) => e.stopPropagation()}>
            <View className={styles.archiveModalHeader}>
              <View>
                <Text className={styles.modalTitle}>验收资料包 · {currentPkg.pileNo}</Text>
                <Text className={styles.archiveProjectName}>{currentPkg.projectName}</Text>
              </View>
              <View className={styles.closeBtn} onClick={() => setShowArchiveModal(false)}>×</View>
            </View>

            <ScrollView scrollY style={{ maxHeight: '65vh' }}>
              <View className={styles.archiveOverview}>
                <View className={styles.archiveOverviewHeader}>
                  <Text className={styles.archiveBlockTitle}>资料总览</Text>
                  <View className={classnames(
                    styles.archiveBadge,
                    currentPkg.confirmed ? styles.confirmed : styles.pendingConfirm
                  )}>
                    {currentPkg.confirmed ? '已归档' : '待确认'}
                  </View>
                </View>
                <View className={styles.archiveOverviewGrid}>
                  <View className={styles.overviewItem}>
                    <Text className={styles.overviewValue}>{currentPkg.passedCheckItems}/{currentPkg.totalCheckItems}</Text>
                    <Text className={styles.overviewLabel}>检查项通过率</Text>
                  </View>
                  <View className={styles.overviewItem}>
                    <Text className={styles.overviewValue}>{currentPkg.totalPhotos}</Text>
                    <Text className={styles.overviewLabel}>留存照片（张）</Text>
                  </View>
                  <View className={styles.overviewItem}>
                    <Text className={styles.overviewValue}>{currentPkg.rectificationCount}</Text>
                    <Text className={styles.overviewLabel}>整改单（条）</Text>
                  </View>
                  <View className={styles.overviewItem}>
                    <Text className={styles.overviewValue}>{currentPkg.closedRectificationCount}/{currentPkg.rectificationCount}</Text>
                    <Text className={styles.overviewLabel}>整改闭环</Text>
                  </View>
                </View>
                <View className={styles.archiveConclusionRow}>
                  <Text className={styles.label}>总体结论：</Text>
                  <Text className={styles.conclusionHighlight}>{currentPkg.overallConclusion || '验收进行中'}</Text>
                </View>
              </View>

              {steps.map((stepConfig, sIdx) => {
                const sr: StepResult | null = currentPkg.steps[stepConfig.key]
                const rects = currentPkg.rectifications.filter(r => r.step === stepConfig.key)
                const allPhotos = sr?.photos || []

                return (
                  <View key={stepConfig.key} className={styles.archiveStepBlock}>
                    <View className={styles.archiveStepHeader}>
                      <Text className={styles.archiveStepIndex}>第{sIdx + 1}环节</Text>
                      <Text className={styles.archiveStepTitle}>{stepConfig.label}</Text>
                      <View className={classnames(
                        styles.stepResultBadge,
                        sr?.checked ? styles.passBadge : styles.missingBadge
                      )}>
                        {sr?.checked ? '已完成' : '未完成'}
                      </View>
                    </View>

                    {sr?.checked ? (
                      <>
                        <View className={styles.archiveBlock}>
                          <Text className={styles.archiveBlockTitle}>检查项（{sr.checkItems.filter(i => i.checked).length}/{sr.checkItems.length}）</Text>
                          <View className={styles.checkItemsCompact}>
                            {sr.checkItems.map(item => (
                              <View key={item.id} className={classnames(styles.checkItemCompact, item.checked && styles.checked)}>
                                <Text className={styles.checkCompactIcon}>{item.checked ? '✓' : '✗'}</Text>
                                <Text>{item.label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        <View className={styles.archiveBlock}>
                          <Text className={styles.archiveBlockTitle}>检查结论</Text>
                          <View className={styles.conclusionBox}>{sr.conclusion || '无'}</View>
                          <View className={styles.archiveMetaRow}>
                            <Text>监理：{sr.inspector}</Text>
                            <Text>{formatTime(sr.checkTime)}</Text>
                          </View>
                        </View>

                        {allPhotos.length > 0 && (
                          <View className={styles.archiveBlock}>
                            <Text className={styles.archiveBlockTitle}>现场照片（{allPhotos.length}张）</Text>
                            <View className={styles.archivePhotoGrid}>
                              {allPhotos.map(photo => (
                                <View
                                  key={photo.id}
                                  className={styles.archivePhotoItem}
                                  onClick={() => {
                                    Taro.previewImage({
                                      current: resolvePhotoUrl(photo.url),
                                      urls: allPhotos.map(p => resolvePhotoUrl(p.url))
                                    })
                                  }}
                                >
                                  <Image
                                    src={resolvePhotoUrl(photo.url)}
                                    mode='aspectFill'
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                  <View className={styles.archivePhotoTime}>
                                    {formatTime(photo.shootTime, 'HH:mm')}
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {rects.length > 0 && (
                          <View className={styles.archiveBlock}>
                            <Text className={styles.archiveBlockTitle}>整改记录（{rects.length}条）</Text>
                            {rects.map(rect => (
                              <RectCardInArchive key={rect.id} rect={rect} />
                            ))}
                          </View>
                        )}
                      </>
                    ) : (
                      <View className={styles.archiveMissing}>本环节尚未完成验收</View>
                    )}
                  </View>
                )
              })}

              <View style={{ height: '32rpx' }} />
            </ScrollView>

            <View className={styles.archiveModalFooter}>
              {!currentPkg.confirmed ? (
                <View
                  className={classnames(styles.btn, styles.btnSuccess, styles.fullWidthBtn)}
                  onClick={handleConfirmArchive}
                >
                  确认归档
                </View>
              ) : (
                <View className={styles.archiveAlreadyConfirmed}>
                  ✅ 已由 {currentPkg.confirmer} 于 {currentPkg.confirmTime && formatTime(currentPkg.confirmTime)} 完成归档
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const RectCardInArchive: React.FC<{ rect: RectificationItem }> = ({ rect }) => {
  return (
    <View className={styles.rectArchiveCard}>
      <View className={styles.rectArchiveHeader}>
        <Text className={styles.rectArchiveType}>
          {ProblemTypeMap[rect.problemType as ProblemType] || rect.problemType}
        </Text>
        <View className={classnames(
          styles.rectArchiveStatus,
          rect.status === 'closed' && styles.closed,
          rect.status === 'rechecking' && styles.rechecking,
          rect.status === 'processing' && styles.processing
        )}>
          {RectificationStatusMap[rect.status]}
        </View>
      </View>
      <View className={styles.rectArchiveDesc}>{rect.problemDesc}</View>
      <View className={styles.rectArchiveRow}>
        <Text className={styles.label}>整改要求：</Text>
        <Text>{rect.requirement}</Text>
      </View>
      {rect.recheckDesc && (
        <View className={styles.rectArchiveRow}>
          <Text className={styles.label}>复查说明：</Text>
          <Text>{rect.recheckDesc}</Text>
        </View>
      )}
      <View className={styles.rectArchiveMeta}>
        <Text>期限：{formatTime(rect.deadline, 'MM-DD HH:mm')}</Text>
        {rect.closeTime && <Text>关闭：{formatTime(rect.closeTime, 'MM-DD HH:mm')}</Text>}
      </View>
    </View>
  )
}

export default AcceptanceDetailPage

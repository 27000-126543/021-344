import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Textarea, ScrollView } from '@tarojs/components'
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
  ProblemType
} from '@/types'
import { AcceptanceStatusMap, AcceptanceStepMap, ProblemTypeMap } from '@/types'

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

  const { piles, acceptanceRecords, getPileById, getRecordByPileId, initCheckItems, submitStepResult, createRectification } = useAcceptanceStore()

  const pile = useMemo(() => getPileById(pileId), [getPileById, pileId, piles])
  const record = useMemo(() => getRecordByPileId(pileId), [getRecordByPileId, pileId, acceptanceRecords])

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

  const loadData = () => {
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

    setStepCheckItems(items)
    setStepPhotos(photos)
    setStepConclusions(conclusions)

    if (currentPile?.currentStep) {
      setExpandedStep(currentPile.currentStep)
    } else if (currentPile?.status === 'pending') {
      setExpandedStep('beforeDrilling')
    } else if (currentPile?.status === 'completed') {
      setExpandedStep(null)
    }

    setInitialized(true)
    console.log('[AcceptanceDetail] 加载数据完成:', pileId, '状态:', currentPile?.status)
  }

  useEffect(() => {
    loadData()
  }, [pileId])

  useDidShow(() => {
    loadData()
    console.log('[AcceptanceDetail] 页面显示，重新加载数据')
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

        <View style={{ height: '200rpx' }} />
      </ScrollView>

      {expandedStep && !isStepCompleted(expandedStep) && canSubmitCurrentStep() && (
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
    </View>
  )
}

export default AcceptanceDetailPage

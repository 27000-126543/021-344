import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StepPanel from '@/components/StepPanel'
import StatusTag from '@/components/StatusTag'
import PhotoUploader from '@/components/PhotoUploader'
import { mockPiles, mockAcceptanceRecords, checkItemTemplates } from '@/data/mock'
import type {
  PileInfo,
  AcceptanceRecord,
  AcceptanceStep,
  StepResult,
  CheckItem,
  PhotoItem,
  ProblemType
} from '@/types'
import { AcceptanceStatusMap, AcceptanceStepMap, ProblemTypeMap } from '@/types'
import { generateId, formatTime } from '@/utils'

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

  const [pile, setPile] = useState<PileInfo | null>(null)
  const [record, setRecord] = useState<AcceptanceRecord | null>(null)
  const [expandedStep, setExpandedStep] = useState<AcceptanceStep | null>(null)

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

  useEffect(() => {
    const foundPile = mockPiles.find(p => p.id === pileId)
    if (foundPile) {
      setPile(foundPile)
    }

    const foundRecord = mockAcceptanceRecords.find(r => r.pileId === pileId)
    if (foundRecord) {
      setRecord(foundRecord)
    }

    initStepData(foundPile, foundRecord)

    console.log('[AcceptanceDetail] 加载桩号:', pileId)
  }, [pileId])

  const initStepData = (pileInfo?: PileInfo | null, rec?: AcceptanceRecord | null) => {
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
      if (rec?.steps[s.key]) {
        items[s.key] = [...(rec.steps[s.key]?.checkItems || [])]
        photos[s.key] = [...(rec.steps[s.key]?.photos || [])]
        conclusions[s.key] = rec.steps[s.key]?.conclusion || ''
      } else {
        items[s.key] = checkItemTemplates[s.key].map(tpl => ({
          id: generateId(),
          key: tpl.key,
          label: tpl.label,
          step: tpl.step,
          checked: false
        }))
      }
    })

    setStepCheckItems(items)
    setStepPhotos(photos)
    setStepConclusions(conclusions)

    if (pileInfo?.currentStep) {
      setExpandedStep(pileInfo.currentStep)
    } else if (pileInfo?.status === 'pending') {
      setExpandedStep('beforeDrilling')
    }
  }

  const currentStepIndex = useMemo(() => {
    if (!pile) return 0
    if (pile.status === 'pending') return 0
    if (pile.status === 'completed') return 2
    return steps.findIndex(s => s.key === pile.currentStep)
  }, [pile])

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

    const stepResult: StepResult = {
      step: stepKey,
      checked: true,
      checkItems: items,
      photos: stepPhotos[stepKey],
      conclusion: stepConclusions[stepKey],
      inspector: '张监理',
      checkTime: new Date().toISOString()
    }

    const newRecord: AcceptanceRecord = record
      ? {
          ...record,
          steps: {
            ...record.steps,
            [stepKey]: stepResult
          },
          updateTime: new Date().toISOString()
        }
      : {
          id: generateId(),
          pileId: pileId,
          pileNo: pile?.pileNo || '',
          projectId: pile?.projectId || '',
          steps: {
            beforeDrilling: stepKey === 'beforeDrilling' ? stepResult : null,
            reinforcementCage: stepKey === 'reinforcementCage' ? stepResult : null,
            pouring: stepKey === 'pouring' ? stepResult : null
          },
          overallConclusion: '',
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        }

    setRecord(newRecord)

    const stepIndex = steps.findIndex(s => s.key === stepKey)
    const isLastStep = stepIndex === steps.length - 1

    if (isLastStep) {
      newRecord.overallConclusion = '验收合格'
      setRecord({ ...newRecord })
      if (pile) {
        setPile({ ...pile, status: 'completed', currentStep: null })
      }
      Taro.showToast({ title: '验收全部完成', icon: 'success' })
      console.log('[AcceptanceDetail] 全部验收完成')
    } else {
      const nextStep = steps[stepIndex + 1].key
      setExpandedStep(nextStep)
      if (pile) {
        setPile({ ...pile, status: 'inProgress', currentStep: nextStep })
      }
      Taro.showToast({ title: `${AcceptanceStepMap[stepKey]}验收完成`, icon: 'success' })
      console.log('[AcceptanceDetail] 步骤验收完成:', stepKey)
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

    Taro.showToast({ title: '整改单已生成', icon: 'success' })
    setShowProblemModal(false)

    if (pile) {
      setPile({ ...pile, hasRectification: true })
    }

    console.log('[AcceptanceDetail] 生成整改单:', {
      pileId,
      step: currentProblemStep,
      problemType: selectedProblemType,
      problemDesc,
      requirement: rectRequirement
    })
  }

  const canSubmitCurrentStep = () => {
    if (!expandedStep || !pile) return false
    if (isStepCompleted(expandedStep)) return false

    const stepIndex = steps.findIndex(s => s.key === expandedStep)
    const currentIndex = pile.status === 'pending' ? 0 : steps.findIndex(s => s.key === pile.currentStep)

    return stepIndex <= currentIndex
  }

  if (!pile) {
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

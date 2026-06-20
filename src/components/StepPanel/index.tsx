import React, { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'
import PhotoUploader from '@/components/PhotoUploader'
import type { CheckItem, PhotoItem, StepResult } from '@/types'
import { formatTime } from '@/utils'

interface StepPanelProps {
  stepNumber: number
  stepKey: 'beforeDrilling' | 'reinforcementCage' | 'pouring'
  title: string
  result: StepResult | null
  checkItems: CheckItem[]
  photos: PhotoItem[]
  pileId: string
  photoCategory: string
  expanded?: boolean
  readonly?: boolean
  onToggle?: () => void
  onCheckChange?: (items: CheckItem[]) => void
  onPhotosChange?: (photos: PhotoItem[]) => void
  onConclusionChange?: (conclusion: string) => void
}

const StepPanel: React.FC<StepPanelProps> = ({
  stepNumber,
  stepKey,
  title,
  result,
  checkItems,
  photos,
  pileId,
  photoCategory,
  expanded: controlledExpanded,
  readonly = false,
  onToggle,
  onCheckChange,
  onPhotosChange,
  onConclusionChange
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = controlledExpanded !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded

  const isCompleted = result?.checked ?? false

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded(!internalExpanded)
    }
  }

  const handleCheckClick = (itemId: string) => {
    if (readonly || !onCheckChange) return
    const updated = checkItems.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )
    onCheckChange(updated)
  }

  const stepClass = `step${stepNumber}`

  return (
    <View className={styles.stepPanel}>
      <View className={styles.panelHeader} onClick={handleToggle}>
        <View className={styles.stepInfo}>
          <View
            className={classnames(styles.stepNumber, styles[stepClass], {
              [styles.completed]: isCompleted
            })}
          >
            {isCompleted ? '✓' : stepNumber}
          </View>
          <Text className={styles.stepTitle}>{title}</Text>
        </View>
        <View style={{ display: 'flex', alignItems: 'center' }}>
          <Text className={styles.stepStatus}>
            {isCompleted ? '已完成' : expanded ? '进行中' : '待验收'}
          </Text>
          <Text
            className={classnames(styles.arrowIcon, {
              [styles.expanded]: expanded
            })}
          >
            ›
          </Text>
        </View>
      </View>

      {expanded && (
        <View className={styles.panelBody}>
          <View className={styles.checkList}>
            {checkItems.map(item => (
              <View key={item.id} className={styles.checkItem} onClick={() => handleCheckClick(item.id)}>
                <View
                  className={classnames(styles.checkbox, {
                    [styles.checked]: item.checked
                  })}
                >
                  {item.checked && <Text>✓</Text>}
                </View>
                <Text className={styles.checkLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View className={styles.photoSection}>
            <PhotoUploader
              photos={photos}
              onChange={onPhotosChange || (() => {})}
              pileId={pileId}
              step={stepKey}
              category={photoCategory}
              readonly={readonly}
            />
          </View>

          {!readonly && (
            <View className={styles.conclusionSection}>
              <Text className={styles.sectionTitle}>检查结论</Text>
              <Textarea
                className={styles.conclusionInput}
                placeholder='请填写检查结论...'
                value={result?.conclusion || ''}
                onInput={(e) => onConclusionChange?.(e.detail.value)}
                maxlength={500}
              />
            </View>
          )}

          {readonly && result?.conclusion && (
            <View className={styles.conclusionSection}>
              <Text className={styles.sectionTitle}>检查结论</Text>
              <Text style={{ fontSize: '28rpx', color: '#4e5969', lineHeight: 1.6 }}>
                {result.conclusion}
              </Text>
            </View>
          )}

          {result?.checked && (
            <View className={styles.inspectorInfo}>
              <Text className={styles.infoItem}>监理：{result.inspector}</Text>
              <Text className={styles.infoItem}>{formatTime(result.checkTime)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default StepPanel

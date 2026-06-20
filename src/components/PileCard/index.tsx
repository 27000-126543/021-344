import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StatusTag from '@/components/StatusTag'
import type { PileInfo } from '@/types'
import { AcceptanceStatusMap, AcceptanceStepMap } from '@/types'

interface PileCardProps {
  pile: PileInfo
  onClick?: (pile: PileInfo) => void
  onViewTimeline?: (pile: PileInfo) => void
}

const PileCard: React.FC<PileCardProps> = ({ pile, onClick, onViewTimeline }) => {
  const steps: Array<'beforeDrilling' | 'reinforcementCage' | 'pouring'> = [
    'beforeDrilling',
    'reinforcementCage',
    'pouring'
  ]

  const getStepStatus = (step: string) => {
    if (pile.status === 'pending') return ''
    if (pile.status === 'completed') return 'done'

    const stepIndex = steps.indexOf(step as any)
    const currentIndex = steps.indexOf(pile.currentStep as any)

    if (stepIndex < currentIndex) return 'done'
    if (stepIndex === currentIndex) return 'active'
    return ''
  }

  const handleClick = () => {
    if (onClick) {
      onClick(pile)
    } else {
      Taro.navigateTo({
        url: `/pages/acceptance-detail/index?id=${pile.id}`
      })
    }
  }

  return (
    <View className={styles.pileCard} onClick={handleClick}>
      <View className={styles.cardHeader}>
        <View style={{ display: 'flex', alignItems: 'center' }}>
          <Text className={styles.pileNo}>{pile.pileNo}</Text>
          {pile.hasRectification && (
            <Text className={styles.rectificationBadge}>待整改</Text>
          )}
        </View>
        <StatusTag status={pile.status} text={AcceptanceStatusMap[pile.status]} />
      </View>

      <View className={styles.pileInfo}>
        <View className={styles.infoItem}>
          <Text className={styles.label}>桩型：</Text>
          <Text>{pile.pileType}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>设计桩长：</Text>
          <Text>{pile.designLength}m</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>桩径：</Text>
          <Text>{pile.designDiameter}mm</Text>
        </View>
      </View>

      <View className={styles.cardFooter}>
        <Text className={styles.projectName}>{pile.projectName}</Text>
        <View style={{ display: 'flex', alignItems: 'center', gap: '20rpx' }}>
          {onViewTimeline && (
            <Text
              className={styles.timelineBtn}
              onClick={(e) => {
                e.stopPropagation()
                onViewTimeline(pile)
              }}
            >
              流转记录
            </Text>
          )}
          <View className={styles.stepIndicator}>
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <View
                  className={classnames(styles.stepDot, {
                    [styles.active]: getStepStatus(step) === 'active',
                    [styles.done]: getStepStatus(step) === 'done'
                  })}
                />
                {index < steps.length - 1 && (
                  <View style={{ width: '24rpx', height: '2rpx', backgroundColor: '#e5e6eb' }} />
                )}
              </React.Fragment>
            ))}
            {pile.currentStep && (
              <Text className={styles.stepText}>
                {AcceptanceStepMap[pile.currentStep]}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

export default PileCard

import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'
import type { PileInfo, AcceptanceRecord, RectificationItem } from '@/types'
import { AcceptanceStepMap, RectificationStatusMap, ProblemTypeMap } from '@/types'
import { formatTime } from '@/utils'

interface PileTimelineProps {
  visible: boolean
  pile: PileInfo | null
  record: AcceptanceRecord | null
  rectifications: RectificationItem[]
  onClose: () => void
}

interface TimelineNode {
  id: string
  type: 'create' | 'step' | 'rect_create' | 'rect_recheck' | 'rect_approve' | 'rect_reject' | 'complete'
  title: string
  description: string
  time: string
  step?: string
  status?: string
}

const PileTimeline: React.FC<PileTimelineProps> = ({
  visible,
  pile,
  record,
  rectifications,
  onClose
}) => {
  const timelineNodes = useMemo<TimelineNode[]>(() => {
    if (!pile) return []

    const nodes: TimelineNode[] = []

    nodes.push({
      id: 'create',
      type: 'create',
      title: '桩号创建',
      description: `${pile.pileNo} 已纳入验收计划`,
      time: pile.createTime
    })

    const steps: Array<'beforeDrilling' | 'reinforcementCage' | 'pouring'> = [
      'beforeDrilling',
      'reinforcementCage',
      'pouring'
    ]

    steps.forEach(step => {
      const stepResult = record?.steps[step]
      if (stepResult?.checked && stepResult.checkTime) {
        nodes.push({
          id: `step_${step}`,
          type: 'step',
          title: `${AcceptanceStepMap[step]}验收完成`,
          description: `检查项 ${stepResult.checkItems.filter(i => i.checked).length}/${stepResult.checkItems.length} 项，照片 ${stepResult.photos.length} 张`,
          time: stepResult.checkTime,
          step
        })
      }
    })

    rectifications.forEach(rect => {
      nodes.push({
        id: `rect_${rect.id}`,
        type: 'rect_create',
        title: `生成整改单 - ${ProblemTypeMap[rect.problemType as keyof typeof ProblemTypeMap] || rect.problemType}`,
        description: rect.problemDesc,
        time: rect.createTime,
        status: RectificationStatusMap[rect.status]
      })

      if (rect.recheckTime) {
        nodes.push({
          id: `rect_recheck_${rect.id}`,
          type: 'rect_recheck',
          title: '施工单位提交复查',
          description: rect.recheckDesc || '已上传复查照片，等待监理复核',
          time: rect.recheckTime
        })
      }

      if (rect.rejectReason) {
        const rejectTime = rect.recheckTime
          ? new Date(new Date(rect.recheckTime).getTime() + 60 * 60 * 1000).toISOString()
          : rect.createTime
        nodes.push({
          id: `rect_reject_${rect.id}`,
          type: 'rect_reject',
          title: '监理驳回复查',
          description: rect.rejectReason,
          time: rejectTime
        })
      }

      if (rect.status === 'closed' && rect.closeTime) {
        nodes.push({
          id: `rect_close_${rect.id}`,
          type: 'rect_approve',
          title: '整改闭环 - 监理复查通过',
          description: `复查人：${rect.closer || '监理'}`,
          time: rect.closeTime
        })
      }
    })

    if (pile.status === 'completed') {
      const pourResult = record?.steps.pouring
      if (pourResult?.checkTime) {
        nodes.push({
          id: 'complete',
          type: 'complete',
          title: '验收完成',
          description: record?.overallConclusion || '全部验收合格',
          time: pourResult.checkTime
        })
      }
    }

    nodes.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    return nodes
  }, [pile, record, rectifications])

  if (!visible) return null

  const getNodeIcon = (type: TimelineNode['type']) => {
    switch (type) {
      case 'create': return '📋'
      case 'step': return '✓'
      case 'rect_create': return '⚠️'
      case 'rect_recheck': return '📝'
      case 'rect_approve': return '✅'
      case 'rect_reject': return '❌'
      case 'complete': return '🏁'
      default: return '•'
    }
  }

  return (
    <View className={styles.modalMask} onClick={onClose}>
      <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <View className={styles.modalHeader}>
          <Text className={styles.modalTitle}>验收流转记录</Text>
          <View className={styles.closeBtn} onClick={onClose}>
            <Text>×</Text>
          </View>
        </View>

        {pile && (
          <View className={styles.pileInfo}>
            <Text className={styles.pileNo}>{pile.pileNo}</Text>
            <Text className={styles.pileProject}>{pile.projectName}</Text>
          </View>
        )}

        <ScrollView scrollY className={styles.timelineScroll}>
          <View className={styles.timeline}>
            {timelineNodes.length === 0 ? (
              <View className={styles.emptyState}>暂无流转记录</View>
            ) : (
              timelineNodes.map((node, index) => {
                const isLast = index === timelineNodes.length - 1
                return (
                  <View key={node.id} className={styles.timelineItem}>
                    <View className={styles.timelineLeft}>
                      <View className={classnames(styles.timelineDot, styles[node.type])}>
                        <Text className={styles.dotIcon}>{getNodeIcon(node.type)}</Text>
                      </View>
                      {!isLast && <View className={styles.timelineLine} />}
                    </View>
                    <View className={styles.timelineContent}>
                      <View className={styles.nodeHeader}>
                        <Text className={styles.nodeTitle}>{node.title}</Text>
                        {node.status && (
                          <Text className={styles.nodeStatus}>{node.status}</Text>
                        )}
                      </View>
                      <Text className={styles.nodeDesc}>{node.description}</Text>
                      <Text className={styles.nodeTime}>{formatTime(node.time)}</Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

export default PileTimeline

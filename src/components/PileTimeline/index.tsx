import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'
import type { PileInfo, TimelineNode as StoreTimelineNode, TimelineNodeType } from '@/types'
import { formatTime } from '@/utils'
import { useAcceptanceStore } from '@/store'

interface PileTimelineProps {
  visible: boolean
  pile: PileInfo | null
  onClose: () => void
  onJumpToDetail?: (node: StoreTimelineNode) => void
}

const PileTimeline: React.FC<PileTimelineProps> = ({
  visible,
  pile,
  onClose,
  onJumpToDetail
}) => {
  const { timelineNodes } = useAcceptanceStore()

  const nodes: StoreTimelineNode[] = useMemo(() => {
    if (!pile) return []
    const list = timelineNodes.filter(n => n.pileId === pile.id)
    return [...list].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [pile, timelineNodes])

  if (!visible) return null

  const getNodeIcon = (type: TimelineNodeType) => {
    switch (type) {
      case 'create': return '📋'
      case 'step': return '✓'
      case 'photo_save': return '📷'
      case 'rect_create': return '⚠️'
      case 'rect_recheck': return '📝'
      case 'rect_approve': return '✅'
      case 'rect_reject': return '❌'
      case 'archive_generate': return '📦'
      case 'archive_confirm': return '🗂️'
      case 'complete': return '🏁'
      default: return '•'
    }
  }

  const getNodeTypeLabel = (type: TimelineNodeType) => {
    switch (type) {
      case 'create': return '桩号创建'
      case 'step': return '步骤验收'
      case 'photo_save': return '照片留存'
      case 'rect_create': return '整改生成'
      case 'rect_recheck': return '复查提交'
      case 'rect_approve': return '复查通过'
      case 'rect_reject': return '复查驳回'
      case 'archive_generate': return '资料包生成'
      case 'archive_confirm': return '归档确认'
      case 'complete': return '验收完成'
      default: return '操作'
    }
  }

  const canJump = (type: TimelineNodeType) => {
    return [
      'step',
      'photo_save',
      'rect_create',
      'rect_recheck',
      'rect_approve',
      'rect_reject',
      'archive_generate',
      'archive_confirm'
    ].includes(type)
  }

  return (
    <View className={styles.modalMask} onClick={onClose}>
      <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <View className={styles.modalHeader}>
          <View>
            <Text className={styles.modalTitle}>验收流转记录</Text>
            <Text className={styles.subTitle}>归档视角 · 全流程可追溯</Text>
          </View>
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
            {nodes.length === 0 ? (
              <View className={styles.emptyState}>暂无流转记录</View>
            ) : (
              nodes.map((node, index) => {
                const isLast = index === nodes.length - 1
                const isJumpable = canJump(node.type)
                return (
                  <View
                    key={node.id}
                    className={classnames(
                      styles.timelineItem,
                      isJumpable && styles.clickable,
                      styles[`type_${node.type}`]
                    )}
                    onClick={() => {
                      if (isJumpable && onJumpToDetail) {
                        onJumpToDetail(node)
                      }
                    }}
                  >
                    <View className={styles.timelineLeft}>
                      <View className={classnames(styles.timelineDot, styles[`dot_${node.type}`])}>
                        <Text className={styles.dotIcon}>{getNodeIcon(node.type)}</Text>
                      </View>
                      {!isLast && <View className={styles.timelineLine} />}
                    </View>
                    <View className={styles.timelineContent}>
                      <View className={styles.nodeHeader}>
                        <Text className={styles.nodeTitle}>{node.title}</Text>
                        <View className={classnames(styles.nodeTypeTag, styles[`tag_${node.type}`])}>
                          {getNodeTypeLabel(node.type)}
                        </View>
                      </View>
                      {node.description && (
                        <Text className={styles.nodeDesc}>{node.description}</Text>
                      )}
                      <View className={styles.nodeMetaRow}>
                        <Text className={styles.nodeTime}>{formatTime(node.time)}</Text>
                        {node.operator && <Text className={styles.nodeOperator}>操作人：{node.operator}</Text>}
                        {isJumpable && (
                          <Text className={styles.jumpHint}>查看明细 ›</Text>
                        )}
                      </View>
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

import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StatusTag from '@/components/StatusTag'
import { mockRectifications } from '@/data/mock'
import type { RectificationItem, RectificationStatus } from '@/types'
import { RectificationStatusMap, ProblemTypeMap } from '@/types'
import { formatTime } from '@/utils'

const filterOptions: Array<{ key: RectificationStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待整改' },
  { key: 'processing', label: '整改中' },
  { key: 'rechecking', label: '待复查' },
  { key: 'closed', label: '已关闭' }
]

const RectificationPage: React.FC = () => {
  const [list, setList] = useState<RectificationItem[]>(mockRectifications)
  const [activeFilter, setActiveFilter] = useState<RectificationStatus | 'all'>('all')

  useDidShow(() => {
    console.log('[Rectification] 页面显示')
  })

  usePullDownRefresh(() => {
    setTimeout(() => {
      setList([...mockRectifications])
      Taro.stopPullDownRefresh()
    }, 800)
  })

  const filteredList = useMemo(() => {
    if (activeFilter === 'all') return list
    return list.filter(item => item.status === activeFilter)
  }, [list, activeFilter])

  const stats = useMemo(() => {
    return {
      total: list.length,
      pending: list.filter(i => i.status === 'pending').length,
      processing: list.filter(i => i.status === 'processing').length,
      rechecking: list.filter(i => i.status === 'rechecking').length,
      closed: list.filter(i => i.status === 'closed').length
    }
  }, [list])

  const handleCardClick = (item: RectificationItem) => {
    Taro.navigateTo({
      url: `/pages/rectification-detail/index?id=${item.id}`
    })
  }

  const isDeadlineNear = (deadline: string) => {
    const now = Date.now()
    const dl = new Date(deadline).getTime()
    return dl - now < 24 * 3600 * 1000 && dl > now
  }

  const isOverdue = (deadline: string, status: RectificationStatus) => {
    if (status === 'closed') return false
    const now = Date.now()
    const dl = new Date(deadline).getTime()
    return dl < now
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.pageTitle}>整改跟踪</Text>
        <Text className={styles.pageSubtitle}>问题上报 · 整改复查 · 闭环管理</Text>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.total}</Text>
            <View className={styles.statLabel}>全部</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.pending + stats.processing}</Text>
            <View className={styles.statLabel}>整改中</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.rechecking}</Text>
            <View className={styles.statLabel}>待复查</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.closed}</Text>
            <View className={styles.statLabel}>已关闭</View>
          </View>
        </View>
      </View>

      <View className={styles.filterTabs}>
        {filterOptions.map(option => (
          <View
            key={option.key}
            className={classnames(styles.filterTab, {
              [styles.active]: activeFilter === option.key
            })}
            onClick={() => setActiveFilter(option.key)}
          >
            {option.label}
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.listSection} style={{ height: 'calc(100vh - 380rpx)' }}>
        {filteredList.length > 0 ? (
          filteredList.map(item => (
            <View key={item.id} className={styles.rectCard} onClick={() => handleCardClick(item)}>
              <View className={styles.cardHeader}>
                <View style={{ display: 'flex', alignItems: 'center' }}>
                  <Text className={styles.pileNo}>{item.pileNo}</Text>
                  <Text className={styles.problemType}>
                    {ProblemTypeMap[item.problemType as keyof typeof ProblemTypeMap] || item.problemType}
                  </Text>
                </View>
                <StatusTag status={item.status} text={RectificationStatusMap[item.status]} />
              </View>

              <Text className={styles.problemDesc}>{item.problemDesc}</Text>

              <View className={styles.cardFooter}>
                <View className={styles.footerItem}>
                  <Text className={styles.label}>整改期限：</Text>
                  <Text
                    className={classnames({
                      [styles.deadlineWarning]: isOverdue(item.deadline, item.status) || isDeadlineNear(item.deadline)
                    })}
                  >
                    {formatTime(item.deadline, 'MM-DD HH:mm')}
                    {isOverdue(item.deadline, item.status) && '（已逾期）'}
                    {!isOverdue(item.deadline, item.status) && isDeadlineNear(item.deadline) && '（即将到期）'}
                  </Text>
                </View>
              </View>

              <View className={styles.cardFooter} style={{ marginTop: 0, borderTop: 'none', paddingTop: '16rpx' }}>
                <View className={styles.footerItem}>
                  <Text className={styles.label}>负责人：</Text>
                  <Text>{item.handler}</Text>
                </View>
                <View className={styles.footerItem}>
                  <Text>{formatTime(item.createTime, 'MM-DD HH:mm')}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>暂无整改记录</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default RectificationPage

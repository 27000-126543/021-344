import React, { useState, useMemo } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import PileCard from '@/components/PileCard'
import { mockPiles } from '@/data/mock'
import type { PileInfo, AcceptanceStatus } from '@/types'

const filterOptions: Array<{ key: AcceptanceStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待验收' },
  { key: 'inProgress', label: '验收中' },
  { key: 'completed', label: '已完成' }
]

const ProjectListPage: React.FC = () => {
  const [piles, setPiles] = useState<PileInfo[]>(mockPiles)
  const [searchText, setSearchText] = useState('')
  const [activeFilter, setActiveFilter] = useState<AcceptanceStatus | 'all'>('all')
  const [refreshing, setRefreshing] = useState(false)

  useDidShow(() => {
    console.log('[ProjectList] 页面显示')
  })

  usePullDownRefresh(() => {
    handleRefresh()
  })

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setPiles([...mockPiles])
      setRefreshing(false)
      Taro.stopPullDownRefresh()
      console.log('[ProjectList] 刷新完成')
    }, 800)
  }

  const filteredPiles = useMemo(() => {
    let result = piles

    if (searchText) {
      result = result.filter(
        p =>
          p.pileNo.toLowerCase().includes(searchText.toLowerCase()) ||
          p.projectName.includes(searchText)
      )
    }

    if (activeFilter !== 'all') {
      result = result.filter(p => p.status === activeFilter)
    }

    return result
  }, [piles, searchText, activeFilter])

  const stats = useMemo(() => {
    const total = piles.length
    const pending = piles.filter(p => p.status === 'pending').length
    const inProgress = piles.filter(p => p.status === 'inProgress').length
    const completed = piles.filter(p => p.status === 'completed').length
    return { total, pending, inProgress, completed }
  }, [piles])

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.pageTitle}>桩基验收记录</Text>
        <Text className={styles.pageSubtitle}>旁站检查 · 隐蔽验收 · 闭环管理</Text>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.total}</Text>
            <View className={styles.statLabel}>总桩数</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.pending}</Text>
            <View className={styles.statLabel}>待验收</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.inProgress}</Text>
            <View className={styles.statLabel}>验收中</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.completed}</Text>
            <View className={styles.statLabel}>已完成</View>
          </View>
        </View>
      </View>

      <View className={styles.searchSection}>
        <View className={styles.searchBox}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder='搜索桩号或项目名称'
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
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
      </View>

      <ScrollView scrollY className={styles.listSection} style={{ height: 'calc(100vh - 400rpx)' }}>
        <Text className={styles.listTitle}>桩号列表（{filteredPiles.length}）</Text>

        {filteredPiles.length > 0 ? (
          filteredPiles.map(pile => (
            <PileCard key={pile.id} pile={pile} />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无相关桩号</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default ProjectListPage

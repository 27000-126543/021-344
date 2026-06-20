import React, { useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import styles from './index.module.scss'
import { useAcceptanceStore } from '@/store'

const MinePage: React.FC = () => {
  const { piles, rectifications, clearStorage } = useAcceptanceStore()

  useDidShow(() => {
    console.log('[Mine] 页面显示，当前整改单数:', rectifications.length)
  })

  const totalAccepted = useMemo(() => piles.filter(p => p.status === 'completed').length, [piles])
  const totalPiles = useMemo(() => piles.length, [piles])
  const pendingRect = useMemo(() => rectifications.filter(
    r => r.status === 'pending' || r.status === 'processing' || r.status === 'rechecking'
  ).length, [rectifications])

  const handleMenuItem = (key: string) => {
    Taro.showToast({
      title: '功能开发中',
      icon: 'none'
    })
    console.log('[Mine] 点击菜单:', key)
  }

  return (
    <View className={styles.page}>
      <View className={styles.profileHeader}>
        <View className={styles.profileInfo}>
          <View className={styles.avatar}>张</View>
          <View className={styles.profileText}>
            <Text className={styles.name}>张监理</Text>
            <Text className={styles.position}>总监理工程师</Text>
            <Text className={styles.company}>天津市建设监理有限公司</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsSection}>
        <View className={styles.statsCard}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{totalAccepted}/{totalPiles}</Text>
            <View className={styles.statLabel}>验收完成</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{rectifications.length}</Text>
            <View className={styles.statLabel}>整改记录</View>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{pendingRect}</Text>
            <View className={styles.statLabel}>待处理</View>
          </View>
        </View>
      </View>

      <Text className={styles.sectionTitle}>常用功能</Text>

      <View className={styles.menuSection}>
        <View className={styles.menuItem} onClick={() => handleMenuItem('projects')}>
          <Text className={styles.menuIcon}>🏗️</Text>
          <Text className={styles.menuText}>项目管理</Text>
          <Text className={styles.menuValue}>2个项目</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View className={styles.menuItem} onClick={() => handleMenuItem('export')}>
          <Text className={styles.menuIcon}>📤</Text>
          <Text className={styles.menuText}>验收记录导出</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View className={styles.menuItem} onClick={() => handleMenuItem('template')}>
          <Text className={styles.menuIcon}>📋</Text>
          <Text className={styles.menuText}>检查项模板</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
      </View>

      <Text className={styles.sectionTitle}>系统设置</Text>

      <View className={styles.menuSection}>
        <View className={styles.menuItem} onClick={() => handleMenuItem('account')}>
          <Text className={styles.menuIcon}>👤</Text>
          <Text className={styles.menuText}>账号管理</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View className={styles.menuItem} onClick={() => handleMenuItem('notify')}>
          <Text className={styles.menuIcon}>🔔</Text>
          <Text className={styles.menuText}>消息通知</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
        <View className={styles.menuItem} onClick={() => handleMenuItem('about')}>
          <Text className={styles.menuIcon}>ℹ️</Text>
          <Text className={styles.menuText}>关于</Text>
          <Text className={styles.menuValue}>v1.0.0</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
      </View>

      <View className={styles.menuSection}>
        <View
          className={styles.menuItem}
          onClick={() => {
            Taro.showModal({
              title: '重置数据',
              content: '确定要清除所有本地数据，恢复初始模拟数据吗？此操作不可撤销。',
              success: (res) => {
                if (res.confirm) {
                  clearStorage()
                  Taro.showToast({ title: '已重置数据', icon: 'success' })
                }
              }
            })
          }}
        >
          <Text className={styles.menuIcon}>🔄</Text>
          <Text className={styles.menuText}>重置测试数据</Text>
          <Text className={styles.menuArrow}>›</Text>
        </View>
      </View>
    </View>
  )
}

export default MinePage

import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface StatusTagProps {
  status: string
  text: string
}

const StatusTag: React.FC<StatusTagProps> = ({ status, text }) => {
  const statusClassMap: Record<string, string> = {
    pending: styles.pending,
    inProgress: styles.inProgress,
    completed: styles.completed,
    processing: styles.processing,
    rechecking: styles.rechecking,
    closed: styles.closed
  }

  return (
    <View className={classnames(styles.statusTag, statusClassMap[status])}>
      <Text>{text}</Text>
    </View>
  )
}

export default StatusTag

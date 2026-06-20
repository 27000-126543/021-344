import React, { useState, useEffect } from 'react'
import { View, Text, Image, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { mockRectifications } from '@/data/mock'
import type { RectificationItem, RectificationStatus, PhotoItem } from '@/types'
import { RectificationStatusMap, ProblemTypeMap, AcceptanceStepMap } from '@/types'
import { formatTime } from '@/utils'

const RectificationDetailPage: React.FC = () => {
  const router = useRouter()
  const rectId = router.params.id || 'rect001'

  const [rect, setRect] = useState<RectificationItem | null>(null)
  const [showRecheckInput, setShowRecheckInput] = useState(false)
  const [recheckComment, setRecheckComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    const found = mockRectifications.find(r => r.id === rectId)
    if (found) {
      setRect(found)
    }
    console.log('[RectificationDetail] 加载整改单:', rectId)
  }, [rectId])

  const handleApprove = () => {
    if (!rect) return

    if (rect.status === 'rechecking') {
      if (!recheckComment.trim()) {
        setShowRecheckInput(true)
        Taro.showToast({ title: '请填写复查意见', icon: 'none' })
        return
      }

      Taro.showModal({
        title: '确认关闭',
        content: '确认复查通过并关闭该整改单？',
        success: (res) => {
          if (res.confirm) {
            const updated: RectificationItem = {
              ...rect,
              status: 'closed',
              closeTime: new Date().toISOString(),
              closer: '张监理'
            }
            setRect(updated)
            setShowRecheckInput(false)
            Taro.showToast({ title: '整改单已关闭', icon: 'success' })
            console.log('[RectificationDetail] 整改单已关闭:', rectId)
          }
        }
      })
    }
  }

  const handleReject = () => {
    setShowRejectModal(true)
  }

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      Taro.showToast({ title: '请填写驳回原因', icon: 'none' })
      return
    }

    if (rect) {
      const updated: RectificationItem = {
        ...rect,
        status: 'processing'
      }
      setRect(updated)
    }

    setShowRejectModal(false)
    setRejectReason('')
    Taro.showToast({ title: '已驳回，继续整改', icon: 'none' })
    console.log('[RectificationDetail] 驳回整改:', rectId)
  }

  const handlePhotoPreview = (url: string) => {
    if (!rect) return
    Taro.previewImage({
      current: url,
      urls: rect.recheckPhotos.map(p => p.url)
    })
  }

  const getHeaderClass = (status: RectificationStatus) => {
    if (status === 'closed') return styles.closed
    if (status === 'rechecking') return styles.rechecking
    return ''
  }

  const getTimelineData = () => {
    if (!rect) return []
    const list: Array<{ title: string; desc: string; time: string; status: 'done' | 'current' | 'pending' }> = [
      {
        title: '问题上报',
        desc: rect.problemDesc,
        time: formatTime(rect.createTime),
        status: 'done'
      }
    ]

    if (rect.recheckTime && rect.recheckDesc) {
      list.push({
        title: '施工单位整改回复',
        desc: rect.recheckDesc,
        time: formatTime(rect.recheckTime),
        status: rect.status === 'closed' || rect.status === 'rechecking' ? 'done' : 'current'
      })
    }

    if (rect.closeTime) {
      list.push({
        title: '监理复查通过',
        desc: `关闭人：${rect.closer || '张监理'}`,
        time: formatTime(rect.closeTime),
        status: 'done'
      })
    }

    if (rect.status === 'processing' || rect.status === 'pending') {
      list.push({
        title: '待施工单位整改',
        desc: `整改期限：${formatTime(rect.deadline)}`,
        time: '',
        status: 'current'
      })
    } else if (rect.status === 'rechecking') {
      list.push({
        title: '待监理复查',
        desc: '施工单位已提交整改回复，等待监理复查确认',
        time: '',
        status: 'current'
      })
    }

    return list
  }

  if (!rect) {
    return (
      <View className={styles.page}>
        <Text>加载中...</Text>
      </View>
    )
  }

  const timelineData = getTimelineData()
  const isRechecking = rect.status === 'rechecking'
  const isClosed = rect.status === 'closed'

  return (
    <View className={styles.page}>
      <ScrollView scrollY style={{ height: '100vh' }}>
        <View className={classnames(styles.statusHeader, getHeaderClass(rect.status))}>
          <Text className={styles.statusText}>
            {RectificationStatusMap[rect.status]}
          </Text>
          <Text className={styles.pileNo}>{rect.pileNo}</Text>
          <View>
            <Text className={styles.problemType}>
              {ProblemTypeMap[rect.problemType as keyof typeof ProblemTypeMap] || rect.problemType}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <View className={styles.infoItem}>
              <Text className={styles.label}>所属项目：</Text>
              <Text>{rect.projectName}</Text>
            </View>
          </View>
          <View className={styles.infoRow}>
            <View className={styles.infoItem}>
              <Text className={styles.label}>关联环节：</Text>
              <Text>{AcceptanceStepMap[rect.step]}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.label}>负责人：</Text>
              <Text>{rect.handler}</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>⚠️</Text>
            问题描述
          </Text>
          <Text className={styles.sectionContent}>{rect.problemDesc}</Text>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>📋</Text>
            整改要求
          </Text>
          <Text className={styles.sectionContent}>{rect.requirement}</Text>
          <View style={{ marginTop: '24rpx', fontSize: '24rpx', color: '#86909c' }}>
            整改期限：{formatTime(rect.deadline)}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>📝</Text>
            施工单位整改回复
          </Text>

          {rect.recheckDesc ? (
            <>
              <Text className={styles.sectionContent}>{rect.recheckDesc}</Text>

              <View className={styles.photoSection}>
                <Text style={{ fontSize: '28rpx', color: '#4e5969', marginBottom: '8rpx' }}>
                  整改照片（{rect.recheckPhotos.length}张）
                </Text>
                {rect.recheckPhotos.length > 0 ? (
                  <View className={styles.photoGrid}>
                    {rect.recheckPhotos.map(photo => (
                      <View key={photo.id} className={styles.photoItem}>
                        <Image
                          className={styles.photo}
                          src={photo.url}
                          mode='aspectFill'
                          onClick={() => handlePhotoPreview(photo.url)}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className={styles.noPhotos}>暂无照片</Text>
                )}
              </View>

              {rect.recheckTime && (
                <View style={{ marginTop: '24rpx', fontSize: '24rpx', color: '#86909c', textAlign: 'right' }}>
                  提交时间：{formatTime(rect.recheckTime)}
                </View>
              )}
            </>
          ) : (
            <Text className={styles.noPhotos}>施工单位尚未提交整改回复</Text>
          )}
        </View>

        {showRecheckInput && isRechecking && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.titleIcon}>✍️</Text>
              复查意见
            </Text>
            <View className={styles.recheckForm}>
              <View className={styles.formItem}>
                <Textarea
                  className={styles.formTextarea}
                  placeholder='请填写监理复查意见...'
                  value={recheckComment}
                  onInput={(e) => setRecheckComment(e.detail.value)}
                  maxlength={500}
                />
              </View>
            </View>
          </View>
        )}

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.titleIcon}>⏱️</Text>
            处理进度
          </Text>
          <View className={styles.timeline}>
            {timelineData.map((item, index) => (
              <View
                key={index}
                className={classnames(styles.timelineItem, {
                  [styles.done]: item.status === 'done',
                  [styles.current]: item.status === 'current'
                })}
              >
                <Text className={styles.timelineTitle}>{item.title}</Text>
                <Text className={styles.timelineDesc}>{item.desc}</Text>
                {item.time && <Text className={styles.timelineTime}>{item.time}</Text>}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: '200rpx' }} />
      </ScrollView>

      {isRechecking && (
        <View className={styles.bottomBar}>
          <View className={classnames(styles.btn, styles.btnDanger)} onClick={handleReject}>
            驳回整改
          </View>
          <View className={classnames(styles.btn, styles.btnPrimary)} onClick={handleApprove}>
            复查通过
          </View>
        </View>
      )}

      {showRejectModal && (
        <View className={styles.modalMask} onClick={() => setShowRejectModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>驳回整改</Text>
            <Text className={styles.modalLabel}>
              <Text className={styles.required}>*</Text> 驳回原因
            </Text>
            <Textarea
              className={styles.modalTextarea}
              placeholder='请填写驳回原因和补充整改要求...'
              value={rejectReason}
              onInput={(e) => setRejectReason(e.detail.value)}
              maxlength={500}
            />
            <View className={styles.modalActions}>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnCancel)}
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </View>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnDanger)}
                onClick={handleConfirmReject}
              >
                确认驳回
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default RectificationDetailPage

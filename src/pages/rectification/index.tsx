import React, { useState, useMemo } from 'react'
import { View, Text, Image, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StatusTag from '@/components/StatusTag'
import PhotoUploader from '@/components/PhotoUploader'
import { useAcceptanceStore } from '@/store'
import type { RectificationItem, RectificationStatus, PhotoItem } from '@/types'
import { RectificationStatusMap, ProblemTypeMap, AcceptanceStepMap } from '@/types'
import { formatTime, resolvePhotoUrl } from '@/utils'

type TimeFilterKey = 'all' | 'overdue' | 'expiring' | 'rechecking'

const statusFilterOptions: Array<{ key: RectificationStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待整改' },
  { key: 'processing', label: '整改中' },
  { key: 'rechecking', label: '待复查' },
  { key: 'closed', label: '已关闭' }
]

const timeFilterOptions: Array<{ key: TimeFilterKey; label: string; type: string }> = [
  { key: 'all', label: '全部', type: 'normal' },
  { key: 'overdue', label: '已超期', type: 'danger' },
  { key: 'expiring', label: '即将到期', type: 'warning' },
  { key: 'rechecking', label: '待复查', type: 'primary' }
]

const RectificationPage: React.FC = () => {
  const { rectifications, submitRecheck, reviewRectification } = useAcceptanceStore()

  const [activeStatusFilter, setActiveStatusFilter] = useState<RectificationStatus | 'all'>('all')
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilterKey>('all')
  const [activeProject, setActiveProject] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTargetId, setRejectTargetId] = useState('')

  const [recheckInputs, setRecheckInputs] = useState<Record<string, { desc: string; photos: PhotoItem[] }>>({})

  useDidShow(() => {
    console.log('[Rectification] 页面显示，整改单数:', rectifications.length)
  })

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh()
      Taro.showToast({ title: '刷新成功', icon: 'success' })
    }, 500)
  })

  const projectList = useMemo(() => {
    const projects = new Set<string>()
    rectifications.forEach(r => projects.add(r.projectName))
    return Array.from(projects)
  }, [rectifications])

  const now = Date.now()
  const ONE_DAY = 24 * 3600 * 1000

  const isOverdue = (item: RectificationItem) => {
    if (item.status === 'closed') return false
    return new Date(item.deadline).getTime() < now
  }

  const isExpiring = (item: RectificationItem) => {
    if (item.status === 'closed') return false
    const deadlineTime = new Date(item.deadline).getTime()
    return deadlineTime >= now && deadlineTime - now <= ONE_DAY
  }

  const timeStats = useMemo(() => {
    let overdue = 0
    let expiring = 0
    let rechecking = 0
    rectifications.forEach(r => {
      if (r.status === 'closed') return
      if (r.status === 'rechecking') rechecking++
      if (isOverdue(r)) overdue++
      else if (isExpiring(r)) expiring++
    })
    return { overdue, expiring, rechecking }
  }, [rectifications])

  const filteredList = useMemo(() => {
    let result = rectifications

    if (activeProject !== 'all') {
      result = result.filter(r => r.projectName === activeProject)
    }

    if (activeStatusFilter !== 'all') {
      result = result.filter(r => r.status === activeStatusFilter)
    }

    if (activeTimeFilter === 'overdue') {
      result = result.filter(r => isOverdue(r))
    } else if (activeTimeFilter === 'expiring') {
      result = result.filter(r => isExpiring(r))
    } else if (activeTimeFilter === 'rechecking') {
      result = result.filter(r => r.status === 'rechecking')
    }

    return result
  }, [rectifications, activeProject, activeStatusFilter, activeTimeFilter])

  const stats = useMemo(() => {
    const list = filteredList
    return {
      total: list.length,
      pending: list.filter(r => r.status === 'pending').length,
      processing: list.filter(r => r.status === 'processing').length,
      rechecking: list.filter(r => r.status === 'rechecking').length,
      closed: list.filter(r => r.status === 'closed').length
    }
  }, [filteredList])

  const getRecheckInput = (id: string) => {
    if (!recheckInputs[id]) {
      setRecheckInputs(prev => ({
        ...prev,
        [id]: { desc: '', photos: [] }
      }))
      return { desc: '', photos: [] }
    }
    return recheckInputs[id]
  }

  const handleCardClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleRecheckDescChange = (id: string, desc: string) => {
    setRecheckInputs(prev => ({
      ...prev,
      [id]: { ...prev[id], desc }
    }))
  }

  const handleRecheckPhotosChange = (id: string, photos: PhotoItem[]) => {
    setRecheckInputs(prev => ({
      ...prev,
      [id]: { ...prev[id], photos }
    }))
  }

  const handleSubmitRecheck = (item: RectificationItem) => {
    const input = getRecheckInput(item.id)

    if (!input.desc.trim()) {
      Taro.showToast({ title: '请填写复查说明', icon: 'none' })
      return
    }
    if (input.photos.length === 0) {
      Taro.showToast({ title: '请上传整改照片', icon: 'none' })
      return
    }

    submitRecheck(item.id, input.desc, input.photos)
    Taro.showToast({ title: '已提交复查', icon: 'success' })
    console.log('[Rectification] 提交复查:', item.id)
  }

  const handleApprove = (item: RectificationItem) => {
    Taro.showModal({
      title: '确认关闭',
      content: '确认复查通过并关闭该整改单？',
      success: (res) => {
        if (res.confirm) {
          reviewRectification(item.id, 'approve')
          Taro.showToast({ title: '整改单已关闭', icon: 'success' })
          console.log('[Rectification] 复查通过:', item.id)
        }
      }
    })
  }

  const handleReject = (id: string) => {
    setRejectTargetId(id)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      Taro.showToast({ title: '请填写驳回原因', icon: 'none' })
      return
    }

    reviewRectification(rejectTargetId, 'reject', rejectReason)
    setShowRejectModal(false)
    setRejectReason('')
    setRecheckInputs(prev => ({
      ...prev,
      [rejectTargetId]: { desc: '', photos: [] }
    }))
    Taro.showToast({ title: '已驳回，继续整改', icon: 'none' })
    console.log('[Rectification] 驳回整改:', rejectTargetId)
  }

  const handlePhotoPreview = (url: string, allUrls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: allUrls
    })
  }

  const getTimelineData = (item: RectificationItem) => {
    const list: Array<{ title: string; desc: string; time: string; status: 'done' | 'current' | 'pending' }> = [
      {
        title: '问题上报',
        desc: item.problemDesc,
        time: formatTime(item.createTime),
        status: 'done'
      }
    ]

    if (item.rejectReason) {
      list.push({
        title: '监理驳回',
        desc: `驳回原因：${item.rejectReason}`,
        time: '',
        status: 'done'
      })
    }

    if (item.recheckTime && item.recheckDesc) {
      list.push({
        title: '施工单位整改回复',
        desc: item.recheckDesc,
        time: formatTime(item.recheckTime),
        status: item.status === 'closed' ? 'done' : 'done'
      })
    }

    if (item.closeTime) {
      list.push({
        title: '监理复查通过',
        desc: `关闭人：${item.closer || '张监理'}`,
        time: formatTime(item.closeTime),
        status: 'done'
      })
    }

    if (item.status === 'processing' || item.status === 'pending') {
      list.push({
        title: '待施工单位整改',
        desc: `整改期限：${formatTime(item.deadline)}`,
        time: '',
        status: 'current'
      })
    } else if (item.status === 'rechecking') {
      list.push({
        title: '待监理复查',
        desc: '施工单位已提交整改回复，等待监理复查确认',
        time: '',
        status: 'current'
      })
    }

    return list
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.pageTitle}>整改跟踪</Text>
        <Text className={styles.pageSubtitle}>问题上报 · 整改复查 · 闭环管理</Text>

        <View className={styles.reminderRow}>
          <View
            className={classnames(styles.reminderCard, styles.danger)}
            onClick={() => {
              setActiveTimeFilter('overdue')
              setActiveStatusFilter('all')
            }}
          >
            <Text className={styles.reminderValue}>{timeStats.overdue}</Text>
            <Text className={styles.reminderLabel}>已超期</Text>
          </View>
          <View
            className={classnames(styles.reminderCard, styles.warning)}
            onClick={() => {
              setActiveTimeFilter('expiring')
              setActiveStatusFilter('all')
            }}
          >
            <Text className={styles.reminderValue}>{timeStats.expiring}</Text>
            <Text className={styles.reminderLabel}>即将到期</Text>
          </View>
          <View
            className={classnames(styles.reminderCard, styles.primary)}
            onClick={() => {
              setActiveTimeFilter('rechecking')
              setActiveStatusFilter('all')
            }}
          >
            <Text className={styles.reminderValue}>{timeStats.rechecking}</Text>
            <Text className={styles.reminderLabel}>待复查</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterSection}>
        <View className={styles.projectFilter}>
          <Text className={styles.filterLabel}>项目：</Text>
          <ScrollView scrollX className={styles.projectScroll}>
            <View
              className={classnames(styles.projectTag, { [styles.active]: activeProject === 'all' })}
              onClick={() => setActiveProject('all')}
            >
              全部
            </View>
            {projectList.map(project => (
              <View
                key={project}
                className={classnames(styles.projectTag, { [styles.active]: activeProject === project })}
                onClick={() => setActiveProject(project)}
              >
                {project}
              </View>
            ))}
          </ScrollView>
        </View>

        <View className={styles.filterTabs}>
          {statusFilterOptions.map(option => (
            <View
              key={option.key}
              className={classnames(styles.filterTab, {
                [styles.active]: activeStatusFilter === option.key && activeTimeFilter === 'all'
              })}
              onClick={() => {
                setActiveStatusFilter(option.key)
                setActiveTimeFilter('all')
              }}
            >
              {option.label}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.resultInfo}>
        <Text className={styles.resultText}>
          共 {stats.total} 条记录
          {activeProject !== 'all' && ` · ${activeProject}`}
          {activeTimeFilter !== 'all' && ` · ${timeFilterOptions.find(f => f.key === activeTimeFilter)?.label}`}
        </Text>
        {(activeProject !== 'all' || activeTimeFilter !== 'all' || activeStatusFilter !== 'all') && (
          <Text
            className={styles.clearFilter}
            onClick={() => {
              setActiveProject('all')
              setActiveTimeFilter('all')
              setActiveStatusFilter('all')
            }}
          >
            清除筛选
          </Text>
        )}
      </View>

      <ScrollView scrollY className={styles.listSection} style={{ height: 'calc(100vh - 520rpx)' }}>
        {filteredList.length > 0 ? (
          filteredList.map(item => {
            const isExpanded = expandedId === item.id
            const timelineData = getTimelineData(item)
            const recheckInput = getRecheckInput(item.id)

            return (
              <View
                key={item.id}
                className={classnames(styles.rectCard, {
                  [styles.expanded]: isExpanded
                })}
              >
                <View className={styles.cardSummary} onClick={() => handleCardClick(item.id)}>
                  <View className={styles.cardHeader}>
                    <View style={{ display: 'flex', alignItems: 'center' }}>
                      <Text className={styles.pileNo}>{item.pileNo}</Text>
                      <Text className={styles.problemType}>
                        {ProblemTypeMap[item.problemType as keyof typeof ProblemTypeMap] || item.problemType}
                      </Text>
                    </View>
                    <View style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusTag status={item.status} text={RectificationStatusMap[item.status]} />
                      <Text
                        className={classnames(styles.expandIndicator, {
                          [styles.expanded]: isExpanded
                        })}
                      >
                        ›
                      </Text>
                    </View>
                  </View>

                  <Text className={styles.problemDesc}>{item.problemDesc}</Text>

                  <View className={styles.cardFooter}>
                    <View className={styles.footerItem}>
                      <Text className={styles.label}>整改期限：</Text>
                      <Text
                        className={classnames({
                          [styles.deadlineWarning]: isOverdue(item) || isExpiring(item)
                        })}
                      >
                        {formatTime(item.deadline, 'MM-DD HH:mm')}
                        {isOverdue(item) && '（已逾期）'}
                        {!isOverdue(item) && isExpiring(item) && '（即将到期）'}
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

                {isExpanded && (
                  <View className={styles.cardDetail}>
                    <View
                      className={classnames(styles.statusHeader, {
                        [styles.closed]: item.status === 'closed',
                        [styles.rechecking]: item.status === 'rechecking',
                        [styles.processing]: item.status === 'processing' || item.status === 'pending'
                      })}
                    >
                      <Text className={styles.statusTitle}>当前状态：{RectificationStatusMap[item.status]}</Text>
                    </View>

                    <View className={styles.detailSection}>
                      <Text className={styles.detailTitle}>
                        <Text className={styles.titleIcon}>⚠️</Text>
                        问题描述
                      </Text>
                      <Text className={styles.detailContent}>{item.problemDesc}</Text>
                      <View className={styles.detailInfoRow}>
                        <View>
                          <Text className={styles.infoLabel}>所属项目：</Text>
                          <Text className={styles.infoValue}>{item.projectName}</Text>
                        </View>
                        <View>
                          <Text className={styles.infoLabel}>关联环节：</Text>
                          <Text className={styles.infoValue}>{AcceptanceStepMap[item.step]}</Text>
                        </View>
                      </View>
                    </View>

                    <View className={styles.detailSection}>
                      <Text className={styles.detailTitle}>
                        <Text className={styles.titleIcon}>📋</Text>
                        整改要求
                      </Text>
                      <Text className={styles.detailContent}>{item.requirement}</Text>
                      <View className={styles.detailMeta}>
                        整改期限：{formatTime(item.deadline)} · 负责人：{item.handler}
                      </View>
                    </View>

                    {item.rejectReason && (
                      <View className={styles.detailSection}>
                        <Text className={styles.detailTitle}>
                          <Text className={styles.titleIcon}>❌</Text>
                          上次驳回原因
                        </Text>
                        <View className={styles.rejectReason}>
                          <Text className={styles.label}>监理：</Text>
                          <Text>{item.rejectReason}</Text>
                        </View>
                      </View>
                    )}

                    {item.recheckDesc && (
                      <View className={styles.detailSection}>
                        <Text className={styles.detailTitle}>
                          <Text className={styles.titleIcon}>📝</Text>
                          施工单位整改回复
                        </Text>
                        <Text className={styles.detailContent}>{item.recheckDesc}</Text>

                        {item.recheckPhotos.length > 0 && (
                          <View style={{ marginTop: '16rpx' }}>
                            <Text style={{ fontSize: '28rpx', color: '#4e5969', marginBottom: '8rpx' }}>
                              整改照片（{item.recheckPhotos.length}张）
                            </Text>
                            <View className={styles.photoGrid}>
                              {item.recheckPhotos.map(photo => (
                                <View key={photo.id} className={styles.photoItem}>
                                  <Image
                                    className={styles.photo}
                                    src={photo.url}
                                    mode='aspectFill'
                                    onClick={() => handlePhotoPreview(photo.url, item.recheckPhotos.map(p => p.url))}
                                  />
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {item.recheckTime && (
                          <View className={styles.detailMeta} style={{ textAlign: 'right' }}>
                            提交时间：{formatTime(item.recheckTime)}
                          </View>
                        )}
                      </View>
                    )}

                    {(item.status === 'pending' || item.status === 'processing') && (
                      <View className={styles.detailSection}>
                        <Text className={styles.detailTitle}>
                          <Text className={styles.titleIcon}>✍️</Text>
                          施工单位复查说明
                        </Text>
                        <Text className={styles.formLabel}>
                          <Text className={styles.required}>*</Text>复查说明
                        </Text>
                        <Textarea
                          className={styles.formTextarea}
                          placeholder='请填写整改完成情况说明...'
                          value={recheckInput.desc}
                          onInput={(e) => handleRecheckDescChange(item.id, e.detail.value)}
                          maxlength={500}
                        />

                        <View className={styles.uploaderSection}>
                          <PhotoUploader
                            photos={recheckInput.photos}
                            onChange={(photos) => handleRecheckPhotosChange(item.id, photos)}
                            pileId={item.pileId}
                            step={item.step}
                            category='整改复查'
                            title='整改照片'
                          />
                        </View>
                      </View>
                    )}

                    <View className={styles.detailSection}>
                      <Text className={styles.detailTitle}>
                        <Text className={styles.titleIcon}>⏱️</Text>
                        处理进度
                      </Text>
                      <View className={styles.timeline}>
                        {timelineData.map((tItem, index) => (
                          <View
                            key={index}
                            className={classnames(styles.timelineItem, {
                              [styles.done]: tItem.status === 'done',
                              [styles.current]: tItem.status === 'current'
                            })}
                          >
                            <Text className={styles.timelineTitle}>{tItem.title}</Text>
                            <Text className={styles.timelineDesc}>{tItem.desc}</Text>
                            {tItem.time && <Text className={styles.timelineTime}>{tItem.time}</Text>}
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )
          })
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>暂无整改记录</Text>
          </View>
        )}

        <View style={{ height: '200rpx' }} />
      </ScrollView>

      {expandedId && (() => {
        const item = rectifications.find(r => r.id === expandedId)
        if (!item) return null

        if (item.status === 'pending' || item.status === 'processing') {
          const recheckInput = getRecheckInput(item.id)
          const canSubmit = recheckInput.desc.trim() && recheckInput.photos.length > 0

          return (
            <View className={styles.bottomBar}>
              <View
                className={classnames(styles.btn, styles.btnWarning)}
                onClick={() => handleSubmitRecheck(item)}
              >
                提交复查
              </View>
            </View>
          )
        }

        if (item.status === 'rechecking') {
          return (
            <View className={styles.bottomBar}>
              <View
                className={classnames(styles.btn, styles.btnDanger)}
                onClick={() => handleReject(item.id)}
              >
                驳回整改
              </View>
              <View
                className={classnames(styles.btn, styles.btnPrimary)}
                onClick={() => handleApprove(item)}
              >
                复查通过
              </View>
            </View>
          )
        }

        return null
      })()}

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

export default RectificationPage

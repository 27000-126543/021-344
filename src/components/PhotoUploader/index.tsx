import React, { useMemo } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import type { PhotoItem } from '@/types'
import { generateId, formatTime, resolvePhotoUrl } from '@/utils'

interface PhotoUploaderProps {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  pileId: string
  step: 'beforeDrilling' | 'reinforcementCage' | 'pouring'
  category: string
  maxCount?: number
  readonly?: boolean
  title?: string
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  pileId,
  step,
  category,
  maxCount = 9,
  readonly = false,
  title = '现场照片'
}) => {
  const handleChoose = async () => {
    try {
      const remaining = maxCount - photos.length
      if (remaining <= 0) {
        Taro.showToast({ title: `最多上传${maxCount}张`, icon: 'none' })
        return
      }

      const res = await Taro.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const newPhotos: PhotoItem[] = res.tempFilePaths.map((path, index) => ({
        id: generateId(),
        url: path,
        pileId,
        step,
        category,
        shootTime: new Date(Date.now() + index * 1000).toISOString()
      }))

      onChange([...photos, ...newPhotos])
      console.log('[PhotoUploader] 新增照片', newPhotos.length, '张')
    } catch (e) {
      console.error('[PhotoUploader] 选择图片失败', e)
    }
  }

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '提示',
      content: '确认删除这张照片？',
      success: (res) => {
        if (res.confirm) {
          onChange(photos.filter(p => p.id !== id))
        }
      }
    })
  }

  const resolvedUrls = useMemo(
    () => photos.map(p => resolvePhotoUrl(p.url)),
    [photos]
  )

  const handlePreview = (index: number) => {
    Taro.previewImage({
      current: resolvedUrls[index],
      urls: resolvedUrls
    })
  }

  return (
    <View className={styles.photoUploader}>
      <View className={styles.titleRow}>
        <Text className={styles.title}>{title}</Text>
        <Text className={styles.count}>{photos.length}/{maxCount}</Text>
      </View>
      <View className={styles.photoGrid}>
        {photos.map(photo => (
          <View key={photo.id} className={styles.photoItem}>
            <Image
              className={styles.photo}
              src={photo.url}
              mode='aspectFill'
              onClick={() => handlePreview(photo.url)}
            />
            {!readonly && (
              <View className={styles.deleteBtn} onClick={() => handleDelete(photo.id)}>
                <Text>×</Text>
              </View>
            )}
            <View className={styles.photoInfo}>
              <Text className={styles.photoCategory}>{photo.category}</Text>
              <Text className={styles.photoTime}>{formatTime(photo.shootTime, 'MM-DD HH:mm')}</Text>
            </View>
          </View>
        ))}
        {!readonly && photos.length < maxCount && (
          <View className={styles.uploadBtn} onClick={handleChoose}>
            <Text className={styles.plusIcon}>+</Text>
            <Text className={styles.uploadText}>拍照/上传</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default PhotoUploader

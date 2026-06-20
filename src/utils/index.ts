export function formatTime(date: Date | string | number, format = 'YYYY-MM-DD HH:mm'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const PHOTO_STORAGE_PREFIX = 'pile_photo_'
const PHOTO_INDEX_KEY = 'pile_photo_index'

interface PhotoIndex {
  [photoId: string]: {
    savedPath: string
    pileId: string
    step: string
    savedAt: string
  }
}

const loadPhotoIndex = (): PhotoIndex => {
  try {
    const raw = Taro.getStorageSync(PHOTO_INDEX_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[PhotoUtils] 读取照片索引失败:', e)
  }
  return {}
}

const savePhotoIndex = (index: PhotoIndex) => {
  try {
    Taro.setStorageSync(PHOTO_INDEX_KEY, JSON.stringify(index))
  } catch (e) {
    console.warn('[PhotoUtils] 保存照片索引失败:', e)
  }
}

const imageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxWidth = 1080
      let width = img.width
      let height = img.height
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } else {
        reject(new Error('Canvas not supported'))
      }
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

export async function persistPhoto(tempPath: string, photoId: string, pileId: string, step: string): Promise<string> {
  console.log('[PhotoUtils] 开始持久化照片:', photoId, tempPath)

  try {
    const sysInfo = Taro.getSystemInfoSync()
    const isH5 = sysInfo.platform === 'h5' || sysInfo.system?.includes('Windows')

    if (isH5) {
      const base64 = await imageToBase64(tempPath)
      const storageKey = PHOTO_STORAGE_PREFIX + photoId
      try {
        Taro.setStorageSync(storageKey, base64)
        const index = loadPhotoIndex()
        index[photoId] = {
          savedPath: storageKey,
          pileId,
          step,
          savedAt: new Date().toISOString()
        }
        savePhotoIndex(index)
        console.log('[PhotoUtils] H5照片Base64已保存:', storageKey, '大小:', (base64.length / 1024).toFixed(1), 'KB')
        return storageKey
      } catch (e) {
        console.warn('[PhotoUtils] H5照片保存失败，可能超出存储限制:', e)
        return tempPath
      }
    } else {
      try {
        const res = await Taro.saveFile({ tempFilePath: tempPath })
        const savedPath = res.savedFilePath
        const index = loadPhotoIndex()
        index[photoId] = {
          savedPath,
          pileId,
          step,
          savedAt: new Date().toISOString()
        }
        savePhotoIndex(index)
        console.log('[PhotoUtils] 小程序照片已保存:', savedPath)
        return savedPath
      } catch (e) {
        console.warn('[PhotoUtils] saveFile失败，尝试文件系统API:', e)
        try {
          const fs = Taro.getFileSystemManager()
          const savedPath = `${Taro.env.USER_DATA_PATH}/pile_${pileId}_${step}_${photoId}.jpg`
          await new Promise<void>((resolve, reject) => {
            fs.saveFile({
              tempFilePath: tempPath,
              filePath: savedPath,
              success: () => resolve(),
              fail: (err) => reject(err)
            })
          })
          const index = loadPhotoIndex()
          index[photoId] = {
            savedPath,
            pileId,
            step,
            savedAt: new Date().toISOString()
          }
          savePhotoIndex(index)
          console.log('[PhotoUtils] 文件系统API保存成功:', savedPath)
          return savedPath
        } catch (e2) {
          console.error('[PhotoUtils] 照片持久化完全失败:', e2)
          return tempPath
        }
      }
    }
  } catch (e) {
    console.error('[PhotoUtils] 持久化异常:', e)
    return tempPath
  }
}

export function resolvePhotoUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith(PHOTO_STORAGE_PREFIX)) {
    try {
      const base64 = Taro.getStorageSync(path)
      if (base64) return base64
    } catch (e) {
      console.warn('[PhotoUtils] 读取存储照片失败:', path)
    }
    return ''
  }
  return path
}

export function deletePersistedPhoto(photoId: string) {
  try {
    const index = loadPhotoIndex()
    const info = index[photoId]
    if (info) {
      if (info.savedPath.startsWith(PHOTO_STORAGE_PREFIX)) {
        try {
          Taro.removeStorageSync(info.savedPath)
        } catch (e) {}
      } else {
        try {
          const fs = Taro.getFileSystemManager()
          fs.removeSavedFile?.({ filePath: info.savedPath })
        } catch (e) {}
      }
      delete index[photoId]
      savePhotoIndex(index)
      console.log('[PhotoUtils] 已删除持久化照片:', photoId)
    }
  } catch (e) {
    console.warn('[PhotoUtils] 删除持久化照片失败:', e)
  }
}

export async function persistPhotoBatch(photos: Array<{ id: string; url: string; pileId: string; step: string }>): Promise<Array<{ id: string; savedUrl: string }>> {
  const results: Array<{ id: string; savedUrl: string }> = []
  for (const photo of photos) {
    const savedUrl = await persistPhoto(photo.url, photo.id, photo.pileId, photo.step)
    results.push({ id: photo.id, savedUrl })
  }
  return results
}

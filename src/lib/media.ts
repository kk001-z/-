export type ReferenceKind = 'image' | 'video'

export interface PreparedReference {
  kind: ReferenceKind
  name: string
  mimeType: string
  size: number
  duration?: number
  width?: number
  height?: number
  frames: string[]
  timestamps?: number[]
}

const MAX_IMAGE_EDGE = 1600
const MAX_VIDEO_EDGE = 1024
const MAX_VIDEO_FRAMES = 7
const IMAGE_QUALITY = 0.82
const VIDEO_FRAME_QUALITY = 0.76

function fitSize(width: number, height: number, maxEdge: number) {
  const edge = Math.max(width, height)
  if (edge <= maxEdge) return { width, height }
  const scale = maxEdge / edge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取这张图片，请换一张 JPG / PNG / WEBP 图片。'))
    }

    image.src = url
  })
}

export async function prepareImageReference(file: File): Promise<PreparedReference> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件。')
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error('图片文件过大，请选择 25MB 以内的图片。')
  }

  const image = await loadImage(file)
  const size = fitSize(image.naturalWidth, image.naturalHeight, MAX_IMAGE_EDGE)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法处理图片。')

  context.drawImage(image, 0, 0, size.width, size.height)

  return {
    kind: 'image',
    name: file.name,
    mimeType: file.type,
    size: file.size,
    width: image.naturalWidth,
    height: image.naturalHeight,
    frames: [canvasToDataUrl(canvas, IMAGE_QUALITY)],
  }
}

function waitForEvent(target: EventTarget, event: string, errorEvent = 'error') {
  return new Promise<void>((resolve, reject) => {
    const onSuccess = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('视频读取失败，请尝试 MP4 / MOV / WebM。'))
    }
    const cleanup = () => {
      target.removeEventListener(event, onSuccess)
      target.removeEventListener(errorEvent, onError)
    }
    target.addEventListener(event, onSuccess, { once: true })
    target.addEventListener(errorEvent, onError, { once: true })
  })
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.02) return
  const done = waitForEvent(video, 'seeked')
  video.currentTime = time
  await done
}

function sampleTimes(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [0]

  const frameCount = Math.min(
    MAX_VIDEO_FRAMES,
    duration <= 6 ? 4 : duration <= 15 ? 5 : duration <= 35 ? 6 : 7,
  )

  if (frameCount === 1) return [Math.min(duration * 0.5, Math.max(0, duration - 0.05))]

  return Array.from({ length: frameCount }, (_, index) => {
    const ratio = 0.04 + (index / (frameCount - 1)) * 0.92
    return Math.min(Math.max(0, duration * ratio), Math.max(0, duration - 0.04))
  })
}

export async function prepareVideoReference(
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<PreparedReference> {
  if (!file.type.startsWith('video/')) {
    throw new Error('请选择视频文件。')
  }

  if (file.size > 400 * 1024 * 1024) {
    throw new Error('视频文件过大，请选择 400MB 以内的视频。')
  }

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true

  try {
    const ready = waitForEvent(video, 'loadeddata')
    video.src = url
    video.load()
    await ready

    if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration)) {
      throw new Error('无法读取视频尺寸或时长。')
    }

    const target = fitSize(video.videoWidth, video.videoHeight, MAX_VIDEO_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const context = canvas.getContext('2d')

    if (!context) throw new Error('当前浏览器无法处理视频关键帧。')

    const times = sampleTimes(video.duration)
    const frames: string[] = []

    for (let index = 0; index < times.length; index += 1) {
      await seekVideo(video, times[index])
      context.drawImage(video, 0, 0, target.width, target.height)
      frames.push(canvasToDataUrl(canvas, VIDEO_FRAME_QUALITY))
      onProgress?.(index + 1, times.length)
    }

    return {
      kind: 'video',
      name: file.name,
      mimeType: file.type,
      size: file.size,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      frames,
      timestamps: times,
    }
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
    video.load()
  }
}

export async function prepareReference(
  file: File,
  onProgress?: (current: number, total: number) => void,
) {
  if (file.type.startsWith('image/')) return prepareImageReference(file)
  if (file.type.startsWith('video/')) return prepareVideoReference(file, onProgress)
  throw new Error('目前支持图片和视频素材。')
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return ''
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remain = Math.round(seconds % 60)
  return `${minutes}m ${remain}s`
}

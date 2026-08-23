import { toCanvas } from 'html-to-image'

export type ShareImageOutcome =
  | { type: 'downloaded' }
  | { type: 'shared' }
  | { type: 'preview'; dataUrl: string; fileName: string }

type CreateShareImageOptions = {
  previewOnDesktop?: boolean
}

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isMobileDevice = () =>
  isIOS() || /Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1

const canShareFile = (file: File) =>
  typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

const waitForImage = (img: HTMLImageElement, timeoutMs = 10000) =>
  new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    img.addEventListener('load', finish, { once: true })
    img.addEventListener('error', finish, { once: true })
    window.setTimeout(finish, timeoutMs)
  })

// 透明 1x1 GIF：替换 <img> 的 src 后，html-to-image 会跳过内嵌（避免大 base64
// 进 SVG 导致手机无法光栅化），SVG 里只留下一个透明占位，真实图片由 canvas 绘制
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='

type ImageSnapshot = {
  buffer: HTMLCanvasElement
  naturalWidth: number
  naturalHeight: number
  dx: number
  dy: number
  dw: number
  dh: number
  fit: string
  posX: number
  posY: number
}

type PreparedImages = {
  snapshots: ImageSnapshot[]
  restore: () => void
}

// 图片不交给 html-to-image 内嵌：等图片加载好后先截图到离屏画布，
// 再把 DOM 里的 src 换成透明占位（克隆时会带走），文字排版不受影响
const prepareImages = async (node: HTMLElement): Promise<PreparedImages> => {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((img) => waitForImage(img)))
  await Promise.all(
    images
      .filter((img) => img.complete && img.naturalWidth > 0)
      .map((img) => img.decode().catch(() => undefined)),
  )

  const nodeRect = node.getBoundingClientRect()
  const snapshots: ImageSnapshot[] = []
  const originalSrcs = images.map((img) => img.getAttribute('src'))

  for (const img of images) {
    if (img.complete && img.naturalWidth > 0) {
      const buffer = document.createElement('canvas')
      buffer.width = img.naturalWidth
      buffer.height = img.naturalHeight
      buffer.getContext('2d')?.drawImage(img, 0, 0)
      const rect = img.getBoundingClientRect()
      const style = window.getComputedStyle(img)
      const [posXToken, posYToken] = style.objectPosition.split(/\s+/)
      if (rect.width > 0 && rect.height > 0) {
        snapshots.push({
          buffer,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          dx: rect.left - nodeRect.left,
          dy: rect.top - nodeRect.top,
          dw: rect.width,
          dh: rect.height,
          fit: style.objectFit,
          posX: toFraction(posXToken),
          posY: toFraction(posYToken ?? 'center'),
        })
      }
    }
    img.setAttribute('src', TRANSPARENT_PIXEL)
  }

  return {
    snapshots,
    restore: () => {
      images.forEach((img, index) => {
        const original = originalSrcs[index]
        if (original) img.setAttribute('src', original)
      })
    },
  }
}

const SHARE_PIXEL_RATIO = 2

// 按 object-fit 计算图片的裁切源区域
const getSourceRect = (
  iw: number,
  ih: number,
  bw: number,
  bh: number,
  fit: string,
  posX: number,
  posY: number,
) => {
  if (fit === 'cover' || fit === 'contain') {
    const scale =
      fit === 'cover' ? Math.max(bw / iw, bh / ih) : Math.min(bw / iw, bh / ih)
    const sw = bw / scale
    const sh = bh / scale
    return {
      sx: (iw - sw) * posX,
      sy: (ih - sh) * posY,
      sw,
      sh,
    }
  }
  return { sx: 0, sy: 0, sw: iw, sh: ih }
}

const toFraction = (token: string) => {
  const keywordMap: Record<string, number> = {
    left: 0,
    top: 0,
    center: 0.5,
    right: 1,
    bottom: 1,
  }
  if (token in keywordMap) return keywordMap[token]
  if (token.endsWith('%')) return Number.parseFloat(token) / 100
  return 0.5
}

// 手机上 html-to-image 的 SVG foreignObject 渲染 <img> 会丢图，
// 这里用 canvas 原生 drawImage 把离屏截图直接画到结果画布上
const drawSnapshots = (canvas: HTMLCanvasElement, snapshots: ImageSnapshot[]) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  for (const snapshot of snapshots) {
    const source = getSourceRect(
      snapshot.naturalWidth,
      snapshot.naturalHeight,
      snapshot.dw,
      snapshot.dh,
      snapshot.fit,
      snapshot.posX,
      snapshot.posY,
    )
    ctx.drawImage(
      snapshot.buffer,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      snapshot.dx * SHARE_PIXEL_RATIO,
      snapshot.dy * SHARE_PIXEL_RATIO,
      snapshot.dw * SHARE_PIXEL_RATIO,
      snapshot.dh * SHARE_PIXEL_RATIO,
    )
  }
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const createShareImage = async (
  node: HTMLElement,
  fileName: string,
  options: CreateShareImageOptions = {},
): Promise<ShareImageOutcome> => {
  const prepared = await prepareImages(node)
  let dataUrl = ''

  try {
    // 注意：不能用 filter 排除 <img>（1.11.13 的 filter 会导致整个 SVG
    // 渲染异常、文字全部丢失）；src 已换成透明占位，html-to-image 会跳过内嵌
    const canvas = await toCanvas(node, {
      pixelRatio: SHARE_PIXEL_RATIO,
      backgroundColor: '#f8f2ec',
    })
    drawSnapshots(canvas, prepared.snapshots)

    dataUrl = canvas.toDataURL('image/png')
  } finally {
    prepared.restore()
  }

  const blob = await dataUrlToBlob(dataUrl)
  const file = new File([blob], fileName, { type: 'image/png' })

  if (canShareFile(file)) {
    try {
      await navigator.share({
        files: [file],
        title: '档期分享',
      })
      return { type: 'shared' }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error
      }
    }
  }

  if (options.previewOnDesktop) {
    return { type: 'preview', dataUrl, fileName }
  }

  if (isMobileDevice()) {
    return { type: 'preview', dataUrl, fileName }
  }

  downloadBlob(blob, fileName)
  return { type: 'downloaded' }
}

export const getMonthShareFileName = (monthKey: string) =>
  `schedule-share-${monthKey}.png`

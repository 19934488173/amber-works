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

const waitForImages = async (node: HTMLElement) => {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((img) => waitForImage(img)))
  await Promise.all(
    images
      .filter((img) => img.complete && img.naturalWidth > 0)
      .map((img) => img.decode().catch(() => undefined)),
  )
}

const hasTransparentPixel = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const corners: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]
  return corners.some(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] < 255)
}

// 自己用 canvas 把图片转成 data URL 内联到节点上，
// 绕开 html-to-image 在 iOS/PWA 下 fetch 内嵌图片失败导致丢图的问题
const inlineImageAsDataUrl = (img: HTMLImageElement) => {
  if (!img.complete || img.naturalWidth === 0 || img.src.startsWith('data:')) return
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    const transparent = hasTransparentPixel(ctx, canvas.width, canvas.height)
    img.src = transparent
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    // 转码失败时保留原始 src，不影响整体导出
  }
}

const inlineImages = async (node: HTMLElement) => {
  await waitForImages(node)
  Array.from(node.querySelectorAll('img')).forEach(inlineImageAsDataUrl)
  // 换成 data URL 后会重新加载，再等一轮解码，保证后面 canvas 绘制时可用
  await Promise.all(
    Array.from(node.querySelectorAll('img')).map((img) =>
      img.decode().catch(() => undefined),
    ),
  )
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
// 这里用 canvas 原生 drawImage 把每张图片直接画到结果画布上
const drawImagesOnCanvas = (node: HTMLElement, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const nodeRect = node.getBoundingClientRect()
  for (const img of Array.from(node.querySelectorAll('img'))) {
    if (!img.complete || img.naturalWidth === 0) continue
    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    const style = window.getComputedStyle(img)
    const [posXToken, posYToken] = style.objectPosition.split(/\s+/)
    const source = getSourceRect(
      img.naturalWidth,
      img.naturalHeight,
      rect.width,
      rect.height,
      style.objectFit,
      toFraction(posXToken),
      toFraction(posYToken ?? 'center'),
    )
    ctx.drawImage(
      img,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      (rect.left - nodeRect.left) * SHARE_PIXEL_RATIO,
      (rect.top - nodeRect.top) * SHARE_PIXEL_RATIO,
      rect.width * SHARE_PIXEL_RATIO,
      rect.height * SHARE_PIXEL_RATIO,
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
  await inlineImages(node)

  const canvas = await toCanvas(node, {
    pixelRatio: SHARE_PIXEL_RATIO,
    backgroundColor: '#f8f2ec',
  })
  drawImagesOnCanvas(node, canvas)

  const dataUrl = canvas.toDataURL('image/png')

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

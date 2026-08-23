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

// html-to-image 内部会对 SVG 图调用 img.decode()，在部分环境（iOS、后台标签页、
// headless）下永不 resolve，导致导出永久挂起。加一层超时竞速：decode 只是
// 提前解码的优化，超时后 drawImage 仍会按需解码，不影响结果
const nativeImageDecode = HTMLImageElement.prototype.decode
if (nativeImageDecode) {
  HTMLImageElement.prototype.decode = function patchedDecode(this: HTMLImageElement) {
    return Promise.race([
      nativeImageDecode.call(this),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
    ])
  }
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

// SVG foreignObject 里渲染 <img> 在手机上不可靠（丢图甚至导致整张 SVG
// 光栅化失败），因此截图前把 <img> 临时换成同尺寸的 <div> 占位，
// 让 SVG 只负责文字排版，真实图片由 canvas 原生绘制叠加
const prepareImages = async (node: HTMLElement): Promise<PreparedImages> => {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((img) => waitForImage(img)))

  const nodeRect = node.getBoundingClientRect()
  const snapshots: ImageSnapshot[] = []
  const placeholders: Array<{ img: HTMLImageElement; placeholder: HTMLDivElement }> = []

  for (const img of images) {
    const rect = img.getBoundingClientRect()

    if (img.complete && img.naturalWidth > 0 && rect.width > 0 && rect.height > 0) {
      const buffer = document.createElement('canvas')
      buffer.width = img.naturalWidth
      buffer.height = img.naturalHeight
      buffer.getContext('2d')?.drawImage(img, 0, 0)
      const style = window.getComputedStyle(img)
      const [posXToken, posYToken] = style.objectPosition.split(/\s+/)
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

    // 占位 div 保留原 class 和盒子尺寸，布局不变
    const placeholder = document.createElement('div')
    placeholder.className = img.className
    placeholder.style.width = `${rect.width}px`
    placeholder.style.height = `${rect.height}px`
    img.replaceWith(placeholder)
    placeholders.push({ img, placeholder })
  }

  return {
    snapshots,
    restore: () => {
      placeholders.forEach(({ img, placeholder }) => {
        placeholder.replaceWith(img)
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
  let dataUrl = ''

  if (isMobileDevice()) {
    // 手机上 foreignObject 渲染 <img> 不可靠：丢图甚至导致整张 SVG
    // 光栅化失败。把 <img> 临时换成同尺寸 div，SVG 只渲染文字排版，
    // 真实图片由 canvas 原生绘制叠加
    const prepared = await prepareImages(node)
    try {
      const canvas = await toCanvas(node, {
        pixelRatio: SHARE_PIXEL_RATIO,
        backgroundColor: '#f8f2ec',
      })
      drawSnapshots(canvas, prepared.snapshots)
      dataUrl = canvas.toDataURL('image/png')
    } finally {
      prepared.restore()
    }
  } else {
    // 桌面端 foreignObject 渲染正常，直接用 html-to-image 的完整输出
    const canvas = await toCanvas(node, {
      pixelRatio: SHARE_PIXEL_RATIO,
      backgroundColor: '#f8f2ec',
    })
    dataUrl = canvas.toDataURL('image/png')
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

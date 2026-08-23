import { toPng } from 'html-to-image'

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
  await waitForImages(node)

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#f8f2ec',
  })

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

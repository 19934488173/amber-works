import { toPng } from 'html-to-image'

export const createShareImage = async (node: HTMLElement, fileName: string) => {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  })

  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()

  return dataUrl
}

export const getMonthShareFileName = (monthKey: string) =>
  `schedule-share-${monthKey}.png`

import type { BackupPayload } from '../types/schedule'

export type BackupExportResult = 'downloaded' | 'shared' | 'cancelled'

const getBackupFileName = () => `schedule-backup-${new Date().toISOString().slice(0, 10)}.json`

const canShareFile = (file: File) =>
  typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

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

export const downloadJsonBackup = async (payload: BackupPayload): Promise<BackupExportResult> => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const fileName = getBackupFileName()
  const file = new File([blob], fileName, { type: 'application/json' })

  if (canShareFile(file)) {
    try {
      await navigator.share({
        files: [file],
        title: '档期备份',
      })
      return 'shared'
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'cancelled'
    }
  }

  downloadBlob(blob, fileName)
  return 'downloaded'
}

export const readBackupFile = (file: File) =>
  new Promise<BackupPayload>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as BackupPayload)
      } catch {
        reject(new Error('备份文件不是有效的 JSON'))
      }
    }
    reader.onerror = () => reject(new Error('读取备份文件失败'))
    reader.readAsText(file)
  })

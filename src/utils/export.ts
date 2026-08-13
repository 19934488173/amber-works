import type { BackupPayload } from '../types/schedule'

export const downloadJsonBackup = (payload: BackupPayload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `schedule-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
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

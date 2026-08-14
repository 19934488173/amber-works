import { Dialog, Toast } from 'antd-mobile'
import {
  DeleteOutline,
  DownlandOutline,
  FileOutline,
  PhoneFill,
  SetOutline,
  UploadOutline,
} from 'antd-mobile-icons'
import { useScheduleStore } from '../../app/useScheduleStore'
import { downloadJsonBackup, readBackupFile } from '../../utils/export'
import { scheduleRepository } from '../../db/scheduleRepository'
import { StudioBrand } from '../../components/StudioBrand/StudioBrand'

export const SettingsPage = () => {
  const { refresh } = useScheduleStore()

  const exportBackup = async () => {
    try {
      const backup = await scheduleRepository.exportBackup()
      const result = await downloadJsonBackup(backup)
      if (result === 'cancelled') return
      await scheduleRepository.markBackupNow()
      Toast.show(result === 'shared' ? '已打开系统分享' : '已导出备份')
    } catch (error) {
      Toast.show(error instanceof Error ? error.message : '导出失败')
    }
  }

  const importBackup = async (file?: File) => {
    if (!file) return
    void Dialog.confirm({
      content: '导入备份会覆盖当前全部数据，建议先导出当前数据。',
      confirmText: '继续导入',
      onConfirm: async () => {
        try {
          const payload = await readBackupFile(file)
          await scheduleRepository.importBackup(payload)
          await refresh()
          Toast.show('已导入备份')
        } catch (error) {
          Toast.show(error instanceof Error ? error.message : '导入失败')
        }
      },
    })
  }

  const confirmClear = () => {
    void Dialog.confirm({
      content: '清空全部数据？此操作不可恢复。',
      confirmText: '清空',
      onConfirm: async () => {
        await scheduleRepository.clearAll()
        await refresh()
        Toast.show('已清空')
      },
    })
  }

  return (
    <div className="settings-page">
      <header className="settings-page__hero">
        <StudioBrand variant="full" />
      </header>

      <section className="settings-page__card">
        <h2 className="settings-page__card-title">数据管理</h2>
        <div className="settings-page__list">
          <div className="settings-page__row">
            <div className="settings-page__row-main">
              <span className="settings-page__row-icon">
                <DownlandOutline fontSize={18} />
              </span>
              <div className="settings-page__row-text">
                <strong>导出数据</strong>
                <span>保存为 JSON 备份文件</span>
              </div>
            </div>
            <button
              type="button"
              className="settings-page__action-btn"
              onClick={() => {
                void exportBackup()
              }}
            >
              导出
            </button>
          </div>

          <div className="settings-page__row">
            <div className="settings-page__row-main">
              <span className="settings-page__row-icon">
                <UploadOutline fontSize={18} />
              </span>
              <div className="settings-page__row-text">
                <strong>导入数据</strong>
                <span>从备份文件恢复</span>
              </div>
            </div>
            <label
              className="settings-page__action-btn"
              htmlFor="settings-backup-input"
            >
              导入
            </label>
          </div>

          <div className="settings-page__row is-static">
            <div className="settings-page__row-main">
              <span className="settings-page__row-icon">
                <FileOutline fontSize={18} />
              </span>
              <div className="settings-page__row-text">
                <strong>本地存储</strong>
                <span>数据保存在本机 IndexedDB</span>
              </div>
            </div>
          </div>
        </div>
        <input
          id="settings-backup-input"
          className="settings-page__file-input"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            void importBackup(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </section>

      <section className="settings-page__card">
        <h2 className="settings-page__card-title">关于</h2>
        <div className="settings-page__about">
          <div className="settings-page__about-item">
            <div className="settings-page__about-icon">
              <PhoneFill fontSize={16} />
            </div>
            <div className="settings-page__about-text">
              <strong>PWA 应用</strong>
              <span>可添加到 iPhone 主屏幕</span>
            </div>
          </div>
          <div className="settings-page__about-item">
            <div className="settings-page__about-icon">
              <SetOutline fontSize={16} />
            </div>
            <div className="settings-page__about-text">
              <strong>离线可用</strong>
              <span>IndexedDB 本地存储，无需联网</span>
            </div>
          </div>
        </div>
      </section>

      <button type="button" className="settings-page__danger-btn" onClick={confirmClear}>
        <DeleteOutline fontSize={16} />
        清空全部数据
      </button>
    </div>
  )
}

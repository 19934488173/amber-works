import { Dialog, Toast } from 'antd-mobile'
import {
  DeleteOutline,
  DownlandOutline,
  FileOutline,
  PhoneFill,
  SetOutline,
  UploadOutline,
} from 'antd-mobile-icons'
import { useState } from 'react'
import { useAuth } from '../../app/useAuth'
import { useScheduleStore } from '../../app/useScheduleStore'
import { downloadJsonBackup, readBackupFile } from '../../utils/export'
import { scheduleRepository } from '../../db/scheduleRepository'
import { StudioBrand } from '../../components/StudioBrand/StudioBrand'

export const SettingsPage = () => {
  const { refresh } = useScheduleStore()
  const { isConfigured, signOut, user } = useAuth()
  const [isUploadingLocal, setIsUploadingLocal] = useState(false)

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

  const uploadLocalDataToCloud = () => {
    void Dialog.confirm({
      content: '这会用本机 IndexedDB 数据覆盖当前云端数据。建议先导出一份云端备份。',
      confirmText: '上传',
      onConfirm: async () => {
        try {
          setIsUploadingLocal(true)
          await scheduleRepository.uploadLocalDataToCloud()
          await refresh()
          Toast.show('已上传到云端')
        } catch (error) {
          Toast.show(error instanceof Error ? error.message : '上传失败')
        } finally {
          setIsUploadingLocal(false)
        }
      },
    })
  }

  return (
    <div className="settings-page">
      <header className="settings-page__hero">
        <StudioBrand variant="full" />
      </header>

      <section className="settings-page__card">
        <h2 className="settings-page__card-title">账号</h2>
        <div className="settings-page__list">
          <div className="settings-page__row is-static">
            <div className="settings-page__row-main">
              <span className="settings-page__row-icon">
                <SetOutline fontSize={18} />
              </span>
              <div className="settings-page__row-text">
                <strong>{user?.email ?? (isConfigured ? '未登录' : '本地模式')}</strong>
                <span>{isConfigured ? '档期保存在 Supabase 云端数据库' : '配置 Supabase 环境变量后启用账号和云端数据库'}</span>
              </div>
            </div>
          </div>

          {user ? (
            <>
              <div className="settings-page__row">
                <div className="settings-page__row-main">
                  <span className="settings-page__row-icon">
                    <UploadOutline fontSize={18} />
                  </span>
                  <div className="settings-page__row-text">
                    <strong>上传本机数据</strong>
                    <span>把当前设备里的旧数据迁移到云端</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-page__action-btn"
                  disabled={isUploadingLocal}
                  onClick={uploadLocalDataToCloud}
                >
                  上传
                </button>
              </div>

              <div className="settings-page__row">
                <div className="settings-page__row-main">
                  <span className="settings-page__row-icon">
                    <FileOutline fontSize={18} />
                  </span>
                  <div className="settings-page__row-text">
                    <strong>退出登录</strong>
                    <span>退出后需要重新登录才能查看云端数据</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-page__action-btn is-secondary"
                  onClick={() => {
                    void signOut()
                  }}
                >
                  退出
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>

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
                <span>{user ? '导出当前云端数据为 JSON 备份文件' : '保存为 JSON 备份文件'}</span>
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
                <span>{user ? '导入备份并覆盖当前云端数据' : '从备份文件恢复'}</span>
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
                <strong>{user ? '云端存储' : '本地存储'}</strong>
                <span>{user ? '数据保存在 Supabase Postgres' : '数据保存在本机 IndexedDB'}</span>
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
              <strong>{user ? '账号同步' : '离线可用'}</strong>
              <span>{user ? '同一账号可在不同设备访问数据' : 'IndexedDB 本地存储，无需联网'}</span>
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

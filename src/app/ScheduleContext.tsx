import type { ReactNode } from 'react'
import { AppLoading } from '../components/AppLoading/AppLoading'
import { useSchedules } from '../hooks/useSchedules'
import { ScheduleContext } from './scheduleContextCore'

type ScheduleProviderProps = {
  children: ReactNode
  userId?: string | null
}

export const ScheduleProvider = ({ children, userId }: ScheduleProviderProps) => {
  const value = useSchedules(userId)

  return (
    <ScheduleContext.Provider value={value}>
      {children}
      {(value.state === 'idle' || value.state === 'loading') && (
        <div className="app-loading-overlay">
          <AppLoading tone="overlay" title="正在同步档期" description="正在连接数据库并整理最新安排" />
        </div>
      )}
    </ScheduleContext.Provider>
  )
}

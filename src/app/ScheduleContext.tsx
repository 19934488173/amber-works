import type { ReactNode } from 'react'
import { useSchedules } from '../hooks/useSchedules'
import { ScheduleContext } from './scheduleContextCore'

export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const value = useSchedules()
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

import { useContext } from 'react'
import { ScheduleContext } from './scheduleContextCore'

export const useScheduleStore = () => {
  const context = useContext(ScheduleContext)
  if (!context) throw new Error('useScheduleStore must be used inside ScheduleProvider')
  return context
}

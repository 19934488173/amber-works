import { createContext } from 'react'
import type { useSchedules } from '../hooks/useSchedules'

export type ScheduleContextValue = ReturnType<typeof useSchedules>

export const ScheduleContext = createContext<ScheduleContextValue | null>(null)

import type { Schedule } from '../types/schedule'

const toMinutes = (time?: string) => {
  if (!time) return null
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export const hasConflict = (draft: Pick<Schedule, 'date' | 'startTime' | 'endTime'>, schedules: Schedule[], ignoreId?: string) => {
  const start = toMinutes(draft.startTime)
  const end = toMinutes(draft.endTime)
  if (start === null || end === null || start >= end) return false

  return schedules.some((schedule) => {
    if (schedule.id === ignoreId || schedule.date !== draft.date || schedule.status === 'cancelled') {
      return false
    }
    const otherStart = toMinutes(schedule.startTime)
    const otherEnd = toMinutes(schedule.endTime)
    if (otherStart === null || otherEnd === null || otherStart >= otherEnd) return false
    return start < otherEnd && end > otherStart
  })
}

import type { Schedule } from '../types/schedule'

export const DAY_MS = 24 * 60 * 60 * 1000

const cnWeekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const isDateKey = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toDateKey(parseDateKey(value)) === value
}

export const getDateKeyValue = (value?: string | null) =>
  isDateKey(value) ? value : undefined

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const addMonths = (date: Date, months: number) => {
  const next = new Date(date.getFullYear(), date.getMonth(), 1)
  next.setMonth(next.getMonth() + months)
  return next
}

export const setYearMonth = (date: Date, year: number, monthIndex: number) => {
  const next = new Date(date)
  next.setFullYear(year, monthIndex, 1)
  return next
}

export const getTodayKey = () => toDateKey(new Date())

export const formatDateWithWeekday = (dateKey: string) => {
  const date = parseDateKey(dateKey)
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${cnWeekdays[date.getDay()]}`
}

export const formatFullDate = (dateKey: string) => {
  const date = parseDateKey(dateKey)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export const formatYearMonth = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`

export const formatTimeRange = (schedule: Pick<Schedule, 'startTime' | 'endTime'>) => {
  if (schedule.startTime && schedule.endTime) return `${schedule.startTime} - ${schedule.endTime}`
  if (schedule.startTime) return schedule.startTime
  return '全天'
}

export const getMonthDays = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const first = new Date(year, month, 1)
  const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1
  const gridStart = addDays(first, -firstWeekday)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

export const isSameMonth = (date: Date, target: Date) =>
  date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth()

export const sortSchedules = (schedules: Schedule[]) =>
  [...schedules].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
  })

export const parseTimeString = (time?: string) => {
  const [hour = 10, minute = 0] = (time ?? '10:00').split(':').map((part) => Number(part))
  return new Date(2000, 0, 1, hour, minute)
}

export const formatTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export const formatAppointmentDate = (date?: Date) => {
  if (!date) return '选择日期'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${cnWeekdays[date.getDay()]}`
}

export const formatAppointmentTime = (time?: string) => time || '选时间'

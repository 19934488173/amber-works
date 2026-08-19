import { getScheduleServiceSlots, getScheduleSlotDates, getScheduleTrialSlots } from '../types/schedule'
import type { Schedule } from '../types/schedule'

export type MonthStats = {
  monthKey: string
  paidAmount: number
  remainingAmount: number
  scheduleCount: number
  occupiedDays: number
  availableDays: number
}

export type PaymentEvent = {
  schedule: Schedule
  type: PaymentRecord['kind']
  id?: string
  label: string
  date: string
  amount: number
}

type PaymentRecord = Schedule['paymentRecords'][number]

const getStageAmount = (amount?: number) =>
  Number.isFinite(amount) && Number(amount) !== 0 ? Number(amount) : 0

export const getBillableAmount = (schedule: Pick<Schedule, 'amount'>) =>
  Number.isFinite(schedule.amount) ? Number(schedule.amount) : 0

export const getPaidAmount = (schedule: Pick<Schedule, 'amount' | 'paymentRecords'>) => {
  const total = getBillableAmount(schedule)
  const paid = schedule.paymentRecords.reduce((sum, record) => sum + getStageAmount(record.amount), 0)
  return total > 0 ? Math.min(Math.max(paid, 0), total) : paid
}

export const getRemainingAmount = (schedule: Pick<Schedule, 'amount' | 'paymentRecords'>) =>
  Math.max(getBillableAmount(schedule) - getPaidAmount(schedule), 0)

export const getPaymentEvents = (schedule: Schedule): PaymentEvent[] =>
  schedule.paymentRecords
    .filter((record) => getStageAmount(record.amount) !== 0)
    .map((record) => ({
      schedule,
      id: record.id,
      type: record.kind,
      label: record.label || (getStageAmount(record.amount) < 0 ? '冲减' : '收款'),
      date: record.date,
      amount: getStageAmount(record.amount),
    }))

export type GroupedPayment = {
  key: string
  schedule: Schedule
  date: string
  label: string
  amount: number
}

// 同一客户同一天的多笔流水合并为一条展示（标签用 + 连接，金额累加）
export const groupSameDayPayments = (events: PaymentEvent[]): GroupedPayment[] => {
  const groups: GroupedPayment[] = []
  const indexByKey = new Map<string, number>()
  for (const event of events) {
    const key = `${event.schedule.id}|${event.date}`
    const existingIndex = indexByKey.get(key)
    if (existingIndex === undefined) {
      indexByKey.set(key, groups.length)
      groups.push({
        key,
        schedule: event.schedule,
        date: event.date,
        label: event.label,
        amount: event.amount,
      })
    } else {
      const group = groups[existingIndex]
      group.label = `${group.label}+${event.label}`
      group.amount += event.amount
    }
  }
  return groups
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(amount)

export const formatSignedCurrency = (amount: number) =>
  amount < 0 ? `-${formatCurrency(Math.abs(amount))}` : `+${formatCurrency(amount)}`

export const getMonthKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

const getMonthBounds = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start, end }
}

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const countAvailableDays = (date: Date, occupiedDateKeys: Set<string>) => {
  const { start, end } = getMonthBounds(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cursor = new Date(Math.max(start.getTime(), today.getTime()))
  if (cursor > end) return 0

  let count = 0
  while (cursor <= end) {
    if (!occupiedDateKeys.has(toDateKey(cursor))) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

export const getMonthStats = (schedules: Schedule[], date: Date): MonthStats => {
  const monthKey = getMonthKey(date)
  const occupiedDateKeys = new Set<string>()
  let scheduleCount = 0
  const activeSchedules = schedules.filter((schedule) => schedule.status !== 'cancelled')
  const billableSchedules = activeSchedules.filter((schedule) =>
    getScheduleSlotDates(schedule).some((slotDate) => slotDate.startsWith(monthKey)),
  )
  for (const schedule of activeSchedules) {
    for (const slot of getScheduleTrialSlots(schedule)) {
      if (!slot.date.startsWith(monthKey)) continue
      occupiedDateKeys.add(slot.date)
      scheduleCount += 1
    }

    for (const slot of getScheduleServiceSlots(schedule)) {
      if (!slot.date.startsWith(monthKey)) continue
      occupiedDateKeys.add(slot.date)
      scheduleCount += 1
    }
  }
  const paymentEvents = schedules
    .filter((schedule) => schedule.status !== 'cancelled')
    .flatMap((schedule) => getPaymentEvents(schedule))
    .filter((event) => event.date.startsWith(monthKey))
  const paidAmount = paymentEvents.reduce((sum, event) => sum + event.amount, 0)
  const remainingAmount = billableSchedules.reduce((sum, schedule) => sum + getRemainingAmount(schedule), 0)

  return {
    monthKey,
    paidAmount,
    remainingAmount,
    scheduleCount,
    occupiedDays: occupiedDateKeys.size,
    availableDays: countAvailableDays(date, occupiedDateKeys),
  }
}

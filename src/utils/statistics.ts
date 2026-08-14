import type { Schedule } from '../types/schedule'

export type MonthStats = {
  monthKey: string
  paidAmount: number
  remainingAmount: number
  scheduleCount: number
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

export const getMonthStats = (schedules: Schedule[], date: Date): MonthStats => {
  const monthKey = getMonthKey(date)
  const billableSchedules = schedules.filter(
    (schedule) => schedule.status !== 'cancelled' && schedule.date.startsWith(monthKey),
  )
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
    scheduleCount: billableSchedules.length,
  }
}

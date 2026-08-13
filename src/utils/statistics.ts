import type { Schedule } from '../types/schedule'
import { formatYearMonth, parseDateKey, toDateKey } from './date'

export type MonthStats = {
  monthKey: string
  monthLabel: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  firstDepositAmount: number
  trialDepositAmount: number
  finalPaymentAmount: number
  scheduleCount: number
  paidOffCount: number
  unpaidCount: number
  cancelledCount: number

}

export type PaymentEvent = {
  schedule: Schedule
  type: 'first_deposit' | 'trial_deposit' | 'final_payment' | 'legacy_paid' | 'other'
  id?: string
  label: string
  date: string
  amount: number
}

const getStageAmount = (amount?: number) =>
  Number.isFinite(amount) && Number(amount) > 0 ? Number(amount) : 0

const buildLegacyPaymentRecords = (schedule: Schedule) => {
  const records: PaymentEvent[] = []
  const firstDepositAmount = getFirstDepositAmount(schedule)
  const trialDepositAmount = getTrialDepositAmount(schedule)
  const finalPaymentAmount = getReceivedFinalPaymentAmount(schedule)

  if (firstDepositAmount > 0) {
    records.push({
      schedule,
      type: 'first_deposit',
      label: '试妆定金',
      date: schedule.firstDepositDate ?? schedule.date,
      amount: firstDepositAmount,
    })
  }

  if (trialDepositAmount > 0) {
    records.push({
      schedule,
      type: 'trial_deposit',
      label: '复定定金',
      date: schedule.trialDepositDate ?? schedule.date,
      amount: trialDepositAmount,
    })
  }

  if (finalPaymentAmount > 0) {
    records.push({
      schedule,
      type: 'final_payment',
      label: '跟妆尾款',
      date: schedule.finalPaymentDate ?? schedule.date,
      amount: finalPaymentAmount,
    })
  }

  return records
}

export const getBillableAmount = (schedule: Pick<Schedule, 'amount'>) =>
  Number.isFinite(schedule.amount) ? Number(schedule.amount) : 0

export const getFirstDepositAmount = (schedule: Pick<Schedule, 'firstDepositAmount'>) =>
  getStageAmount(schedule.firstDepositAmount)

export const getTrialDepositAmount = (schedule: Pick<Schedule, 'trialDepositAmount'>) =>
  getStageAmount(schedule.trialDepositAmount)

export const getReceivedFinalPaymentAmount = (schedule: Pick<Schedule, 'finalPaymentAmount'>) =>
  getStageAmount(schedule.finalPaymentAmount)

export const getPaidAmount = (
  schedule: Pick<Schedule, 'amount' | 'paidAmount' | 'firstDepositAmount' | 'trialDepositAmount' | 'finalPaymentAmount' | 'paymentRecords'>,
) => {
  const total = getBillableAmount(schedule)
  const recordPaid = (schedule.paymentRecords ?? []).reduce((sum, record) => sum + getStageAmount(record.amount), 0)
  if (recordPaid > 0) return total > 0 ? Math.min(recordPaid, total) : recordPaid
  const stagePaid =
    getFirstDepositAmount(schedule) + getTrialDepositAmount(schedule) + getReceivedFinalPaymentAmount(schedule)
  const paid = stagePaid > 0 ? stagePaid : getStageAmount(schedule.paidAmount)
  return total > 0 ? Math.min(paid, total) : paid
}

export const getRemainingAmount = (
  schedule: Pick<Schedule, 'amount' | 'paidAmount' | 'firstDepositAmount' | 'trialDepositAmount' | 'finalPaymentAmount' | 'paymentRecords'>,
) => Math.max(getBillableAmount(schedule) - getPaidAmount(schedule), 0)

export const getFinalPaymentAmount = (
  schedule: Pick<Schedule, 'amount' | 'paidAmount' | 'firstDepositAmount' | 'trialDepositAmount' | 'finalPaymentAmount' | 'paymentRecords'>,
) => getRemainingAmount(schedule)

export const getPaymentEvents = (schedule: Schedule): PaymentEvent[] => {
  if (schedule.paymentRecords?.length) {
    return schedule.paymentRecords
      .filter((record) => getStageAmount(record.amount) > 0)
      .map((record) => ({
        schedule,
        id: record.id,
        type: record.kind,
        label: record.label || '收款',
        date: record.date,
        amount: getStageAmount(record.amount),
      }))
  }

  const legacyRecords = buildLegacyPaymentRecords(schedule)
  const hasStagePayments = legacyRecords.length > 0

  if (!hasStagePayments) {
    const paidAmount = getPaidAmount(schedule)
    return paidAmount > 0
      ? [{ schedule, type: 'legacy_paid', label: '实收', date: schedule.date, amount: paidAmount }]
      : []
  }

  return legacyRecords
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(amount)

export const getMonthKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

export const getMonthDateRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { startKey: toDateKey(start), endKey: toDateKey(end) }
}

export const isInMonth = (schedule: Pick<Schedule, 'date'>, date: Date) =>
  schedule.date.startsWith(getMonthKey(date))

export const getMonthStats = (schedules: Schedule[], date: Date): MonthStats => {
  const monthKey = getMonthKey(date)
  const monthSchedules = schedules.filter((schedule) => isInMonth(schedule, date))
  const billableSchedules = monthSchedules.filter((schedule) => schedule.status !== 'cancelled')
  const paymentEvents = schedules
    .filter((schedule) => schedule.status !== 'cancelled')
    .flatMap((schedule) => getPaymentEvents(schedule))
    .filter((event) => event.date.startsWith(monthKey))
  const totalAmount = billableSchedules.reduce((sum, schedule) => sum + getBillableAmount(schedule), 0)
  const paidAmount = paymentEvents.reduce((sum, event) => sum + event.amount, 0)
  const remainingAmount = billableSchedules.reduce((sum, schedule) => sum + getRemainingAmount(schedule), 0)
  const firstDepositAmount = paymentEvents
    .filter((event) => event.type === 'first_deposit')
    .reduce((sum, event) => sum + event.amount, 0)
  const trialDepositAmount = paymentEvents
    .filter((event) => event.type === 'trial_deposit')
    .reduce((sum, event) => sum + event.amount, 0)
  const finalPaymentAmount = paymentEvents
    .filter((event) => event.type === 'final_payment')
    .reduce((sum, event) => sum + event.amount, 0)

  return {
    monthKey,
    monthLabel: formatYearMonth(date),
    totalAmount,
    paidAmount,
    remainingAmount,
    firstDepositAmount,
    trialDepositAmount,
    finalPaymentAmount,
    scheduleCount: billableSchedules.length,
    paidOffCount: billableSchedules.filter(
      (schedule) => getBillableAmount(schedule) > 0 && getRemainingAmount(schedule) === 0,
    ).length,
    unpaidCount: billableSchedules.filter((schedule) => getRemainingAmount(schedule) > 0).length,
    cancelledCount: monthSchedules.length - billableSchedules.length,
  }
}

export const getRecentMonthStats = (schedules: Schedule[], anchorDate: Date, count = 6) =>
  Array.from({ length: count }, (_, index) => {
    const month = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - count + index + 1, 1)
    return getMonthStats(schedules, month)
  })

export const getScheduleMonthLabel = (schedule: Pick<Schedule, 'date'>) =>
  formatYearMonth(parseDateKey(schedule.date))

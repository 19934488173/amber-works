import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import type { BrideStage, PaymentRecord, ReferenceImage, ReferenceImageGroup, Schedule, ScheduleDraft, ScheduleSlot, ScheduleStatus, ServiceCategory, ServiceSubtype } from '../types/schedule'
import {
  getDefaultServiceSubtype,
  getScheduleBrideStage,
  getSchedulePrimaryServiceSlot,
  getScheduleServiceSlots,
  getScheduleTrialSlots,
  getServiceSubtypeLabel,
  referenceImageGroupOptions,
} from '../types/schedule'
import { DAY_MS, getTodayKey, parseDateKey, toDateKey } from '../utils/date'
import { getMonthKey, getPaymentEvents, getRemainingAmount } from '../utils/statistics'

export const stageFlow: BrideStage[] = ['inquiry', 'first_deposit', 'trial', 'completed']

export const stageDisplay: Record<BrideStage, { label: string; shortLabel: string; helper: string }> = {
  inquiry: { label: '咨询中', shortLabel: '咨询', helper: '记录客户意向，确认档期' },
  first_deposit: { label: '已预约', shortLabel: '预约', helper: '已收到定金，档期锁定' },
  trial: { label: '已试妆', shortLabel: '试妆', helper: '试妆已完成，等待复定' },
  second_deposit: { label: '已试妆', shortLabel: '试妆', helper: '已复定，准备婚礼跟妆' },
  final_payment: { label: '待跟妆', shortLabel: '跟妆', helper: '临近婚期，确认服装饰品' },
  completed: { label: '已完成', shortLabel: '完成', helper: '已结清' },
  cancelled: { label: '已取消', shortLabel: '取消', helper: '客户已取消' },
}

export type CustomerFormValues = {
  serviceCategory?: ServiceCategory | Array<ServiceCategory>
  serviceSubtype?: ServiceSubtype | Array<ServiceSubtype>
  customer?: string
  phone?: string
  date?: Date
  trialDate?: Date
  serviceSlots?: CustomerFormServiceSlot[]
  startTime?: string
  endTime?: string
  trialStartTime?: string
  trialEndTime?: string
  location?: string
  amount?: string
  firstDepositAmount?: string
  firstDepositDate?: Date
  trialDepositDate?: Date
  trialDepositAmount?: string
  finalPaymentAmount?: string
  finalPaymentDate?: Date
  outfitCount?: string
  jewelryNeed?: string | string[]
  jewelryItems?: string
  note?: string
  brideStage?: BrideStage | Array<BrideStage>
  status?: ScheduleStatus | Array<ScheduleStatus>
}

export type CustomerFormServiceSlot = {
  id?: string
  subtype?: ServiceSubtype | Array<ServiceSubtype>
  date?: Date
  startTime?: string
  endTime?: string
}

export const stageToStatus = (stage: BrideStage): Schedule['status'] => {
  if (stage === 'completed') return 'completed'
  if (stage === 'cancelled') return 'cancelled'
  if (stage === 'first_deposit') return 'confirmed'
  if (stage === 'trial' || stage === 'second_deposit' || stage === 'final_payment') return 'in_progress'
  return 'pending'
}

export const normalizeStage = (stage?: BrideStage): BrideStage => {
  if (stage === 'second_deposit' || stage === 'final_payment') return 'trial'
  return stage ?? 'first_deposit'
}

export const getCustomerName = (schedule: Pick<Schedule, 'customer' | 'title'>) =>
  schedule.customer?.trim() || schedule.title

export const getInitial = (schedule: Pick<Schedule, 'customer' | 'title'>) => getCustomerName(schedule).slice(0, 1)

const getDaysUntil = (dateKey: string, todayKey = getTodayKey()) => {
  const diff = parseDateKey(dateKey).getTime() - parseDateKey(todayKey).getTime()
  return Math.ceil(diff / DAY_MS)
}

export const formatDaysUntil = (dateKey: string, todayKey = getTodayKey()) => {
  const days = getDaysUntil(dateKey, todayKey)
  if (days === 0) return '今天'
  if (days < 0) return '已过'
  return `还有 ${days} 天`
}

export const formatCompactDate = (dateKey: string) => {
  const date = parseDateKey(dateKey)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export const getReferenceImages = (schedule: Schedule, group: ReferenceImageGroup) =>
  (schedule.referenceImages ?? []).filter((image) => image.group === group)

export const toUploadItems = (images: ReferenceImage[]): ImageUploadItem[] =>
  images.map((image) => ({
    key: image.id,
    url: image.url,
    extra: image,
  }))

export const mergeReferenceImages = (
  schedule: Schedule,
  group: ReferenceImageGroup,
  items: ImageUploadItem[],
): ReferenceImage[] => {
  const untouched = (schedule.referenceImages ?? []).filter((image) => image.group !== group)
  const nextGroupImages = items.map((item) => {
    const existing = item.extra as ReferenceImage | undefined
    return {
      id: String(item.key ?? existing?.id ?? crypto.randomUUID()),
      url: item.url,
      name: existing?.name,
      group,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
  })

  return [...untouched, ...nextGroupImages]
}

export const fileToDataUrl = async (file: File) => {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('图片不能超过 8MB')
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return resizeImageDataUrl(dataUrl)
}

const resizeImageDataUrl = (dataUrl: string) =>
  new Promise<string>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const maxSide = 1600
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      if (scale === 1 && dataUrl.length < 900_000) {
        resolve(dataUrl)
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(dataUrl)
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })

const getPositiveAmount = (value?: string) => {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : undefined
}

export const formValuesFromSchedule = (schedule: Schedule): CustomerFormValues => {
  const firstPayment = schedule.paymentRecords.find((record) => record.kind === 'first_deposit')
  const trialPayment = schedule.paymentRecords.find((record) => record.kind === 'trial_deposit')
  const finalPayment = schedule.paymentRecords.find((record) => record.kind === 'final_payment')
  const trialSlot = getScheduleTrialSlots(schedule)[0]
  const serviceSlots = getScheduleServiceSlots(schedule)
  const primaryServiceSlot = getSchedulePrimaryServiceSlot(schedule)

  return {
    serviceCategory: schedule.serviceCategory,
    serviceSubtype: schedule.serviceSubtype,
    customer: schedule.customer,
    phone: schedule.phone,
    date: primaryServiceSlot?.date ? parseDateKey(primaryServiceSlot.date) : parseDateKey(schedule.date),
    trialDate: trialSlot?.date ? parseDateKey(trialSlot.date) : undefined,
    serviceSlots: serviceSlots.map((slot) => ({
      id: slot.id,
      subtype: slot.subtype ?? schedule.serviceSubtype,
      date: parseDateKey(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
    startTime: primaryServiceSlot?.startTime ?? schedule.startTime,
    endTime: primaryServiceSlot?.endTime ?? schedule.endTime,
    trialStartTime: trialSlot?.startTime,
    trialEndTime: trialSlot?.endTime,
    location: schedule.location,
    amount: schedule.amount ? String(schedule.amount) : undefined,
    firstDepositAmount: firstPayment?.amount ? String(firstPayment.amount) : undefined,
    firstDepositDate: firstPayment?.date ? parseDateKey(firstPayment.date) : undefined,
    trialDepositAmount: trialPayment?.amount ? String(trialPayment.amount) : undefined,
    trialDepositDate: trialPayment?.date ? parseDateKey(trialPayment.date) : undefined,
    finalPaymentAmount: finalPayment?.amount ? String(finalPayment.amount) : undefined,
    finalPaymentDate: finalPayment?.date ? parseDateKey(finalPayment.date) : undefined,
    outfitCount: schedule.outfitCount ? String(schedule.outfitCount) : undefined,
    jewelryNeed: schedule.jewelryNeed,
    jewelryItems: schedule.jewelryItems,
    note: schedule.note,
    brideStage: normalizeStage(getScheduleBrideStage(schedule)),
    status: schedule.status,
  }
}

export const getServiceCategoryValue = (serviceCategory?: CustomerFormValues['serviceCategory']) =>
  Array.isArray(serviceCategory) ? serviceCategory[0] : serviceCategory

export const getServiceSubtypeValue = (serviceSubtype?: CustomerFormValues['serviceSubtype']) =>
  Array.isArray(serviceSubtype) ? serviceSubtype[0] : serviceSubtype

export const getBrideStageValue = (brideStage?: CustomerFormValues['brideStage']) =>
  Array.isArray(brideStage) ? brideStage[0] : brideStage

export const getJewelryNeedValue = (jewelryNeed?: CustomerFormValues['jewelryNeed']) =>
  Array.isArray(jewelryNeed) ? jewelryNeed[0] : jewelryNeed

const getScheduleStatusValue = (status?: CustomerFormValues['status']) =>
  Array.isArray(status) ? status[0] : status

const getFormSlotSubtypeValue = (subtype?: CustomerFormServiceSlot['subtype']) =>
  Array.isArray(subtype) ? subtype[0] : subtype

const paymentLabels = {
  bridal: {
    first: '试妆定金',
    trial: '复定定金',
    final: '跟妆尾款',
  },
  daily: {
    first: '预约档期定金',
    trial: '复定定金',
    final: '服务尾款',
  },
} as const

const stagePaymentKinds: PaymentRecord['kind'][] = ['first_deposit', 'trial_deposit', 'final_payment']

const isStagePaymentKind = (kind: PaymentRecord['kind']) => stagePaymentKinds.includes(kind)

const createPaymentRecord = (
  kind: PaymentRecord['kind'],
  label: string,
  amount: number | undefined,
  date: string | undefined,
  existing?: PaymentRecord,
): PaymentRecord | undefined =>
  amount
    ? {
      id: existing?.id ?? crypto.randomUUID(),
      kind,
      label,
      date: date ?? getTodayKey(),
      amount,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    : undefined

const paymentRecordsFromForm = (
  values: CustomerFormValues,
  existing: Schedule | undefined,
  category: ServiceCategory,
): PaymentRecord[] => {
  const existingRecords = existing?.paymentRecords ?? []
  const labels = paymentLabels[category]
  const firstDepositAmount = getPositiveAmount(values.firstDepositAmount)
  const trialDepositAmount = category === 'bridal' ? getPositiveAmount(values.trialDepositAmount) : undefined
  const finalPaymentAmount = getPositiveAmount(values.finalPaymentAmount)
  const firstDepositDate = values.firstDepositDate ? toDateKey(values.firstDepositDate) : undefined
  const trialDepositDate = values.trialDepositDate ? toDateKey(values.trialDepositDate) : undefined
  const finalPaymentDate = values.finalPaymentDate ? toDateKey(values.finalPaymentDate) : undefined
  const records = [
    createPaymentRecord(
      'first_deposit',
      labels.first,
      firstDepositAmount,
      firstDepositDate,
      existingRecords.find((record) => record.kind === 'first_deposit'),
    ),
    category === 'bridal'
      ? createPaymentRecord(
        'trial_deposit',
        labels.trial,
        trialDepositAmount,
        trialDepositDate,
        existingRecords.find((record) => record.kind === 'trial_deposit'),
      )
      : undefined,
    createPaymentRecord(
      'final_payment',
      labels.final,
      finalPaymentAmount,
      finalPaymentDate,
      existingRecords.find((record) => record.kind === 'final_payment'),
    ),
  ].filter((record): record is PaymentRecord => Boolean(record))

  return [
    ...records,
    ...existingRecords.filter((record) => !isStagePaymentKind(record.kind)),
  ]
}

export const draftFromForm = (values: CustomerFormValues, existing?: Schedule): ScheduleDraft => {
  const outfitCount = Number(values.outfitCount)
  const jewelryNeedValue = getJewelryNeedValue(values.jewelryNeed)
  const jewelryNeed = jewelryNeedValue === 'none' ? 'none' : 'borrow'
  const category = getServiceCategoryValue(values.serviceCategory) ?? 'bridal'
  const subtype = getServiceSubtypeValue(values.serviceSubtype) ?? getDefaultServiceSubtype(category)
  const isDaily = category === 'daily'
  const paymentRecords = paymentRecordsFromForm(values, existing, category)
  const hasPayment = paymentRecords.length > 0
  const existingTrialSlot = existing?.serviceSlots?.find((slot) => slot.kind === 'trial')
  const existingServiceSlot = existing?.serviceSlots?.find((slot) => slot.kind === 'service')
  const trialSlot: ScheduleSlot | undefined = !isDaily && values.trialDate
    ? {
      id: existingTrialSlot?.id ?? 'trial',
      kind: 'trial',
      date: toDateKey(values.trialDate),
      startTime: values.trialStartTime?.trim() || existing?.trialStartTime || '10:00',
      endTime: values.trialEndTime?.trim() || existing?.trialEndTime || '18:00',
    }
    : undefined
  const fallbackServiceSlots: CustomerFormServiceSlot[] = [{
    id: existingServiceSlot?.id ?? 'service',
    subtype,
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
  }]
  const formServiceSlots = isDaily
    ? [{
      id: existingServiceSlot?.id ?? 'service',
      subtype,
      date: values.date ?? (existing?.date ? parseDateKey(existing.date) : undefined),
      startTime: values.startTime,
      endTime: values.endTime,
    }]
    : values.serviceSlots?.length
      ? values.serviceSlots
      : fallbackServiceSlots
  const serviceSlots: ScheduleSlot[] = formServiceSlots
    .map((slot): ScheduleSlot | undefined => {
      const date = slot.date ? toDateKey(slot.date) : undefined
      if (!date) return undefined

      return {
        id: slot.id ?? crypto.randomUUID(),
        kind: 'service',
        subtype: getFormSlotSubtypeValue(slot.subtype) ?? subtype,
        date,
        startTime: slot.startTime?.trim() || (isDaily ? existing?.startTime : '06:00'),
        endTime: slot.endTime?.trim() || (isDaily ? existing?.endTime : undefined),
      }
    })
    .filter((slot): slot is ScheduleSlot => Boolean(slot))
  const primaryServiceSlot = serviceSlots[0]
  const date = primaryServiceSlot?.date ?? existing?.date ?? getTodayKey()
  const trialDate = trialSlot?.date
  const formStage = getBrideStageValue(values.brideStage)
  const stage = isDaily
    ? undefined
    : formStage
      ? normalizeStage(formStage)
      : existing
        ? normalizeStage(getScheduleBrideStage(existing))
        : hasPayment
          ? 'first_deposit'
          : 'inquiry'

  return {
    title: getServiceSubtypeLabel(subtype),
    serviceCategory: category,
    serviceSubtype: subtype,
    date,
    startTime: primaryServiceSlot?.startTime,
    endTime: primaryServiceSlot?.endTime,
    status: isDaily ? (getScheduleStatusValue(values.status) ?? existing?.status ?? 'confirmed') : stageToStatus(stage ?? 'inquiry'),
    customer: values.customer?.trim() || existing?.customer || '新客户',
    phone: values.phone?.trim() || undefined,
    location: values.location?.trim() || undefined,
    amount: getPositiveAmount(values.amount),
    trialDate: isDaily ? undefined : trialDate,
    trialStartTime: isDaily ? undefined : trialSlot?.startTime,
    trialEndTime: isDaily ? undefined : trialSlot?.endTime,
    serviceSlots: [trialSlot, ...serviceSlots].filter((slot): slot is ScheduleSlot => Boolean(slot)),
    brideStage: stage,
    outfitCount: !isDaily && Number.isFinite(outfitCount) && outfitCount > 0 ? Math.floor(outfitCount) : undefined,
    jewelryNeed: isDaily ? undefined : jewelryNeed,
    jewelryItems: isDaily || jewelryNeed === 'none' ? undefined : values.jewelryItems?.trim() || undefined,
    note: values.note?.trim() || undefined,
    referenceImages: existing?.referenceImages ?? [],
    paymentRecords,
  }
}

export const getMonthlyIncomeRows = (schedules: Schedule[], anchorDate = new Date(), count = 4) => {
  const rows = Array.from({ length: count }, (_, index) => {
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - index, 1)
    const monthKey = getMonthKey(date)
    const paid = schedules
      .filter((schedule) => schedule.status !== 'cancelled')
      .flatMap((schedule) => getPaymentEvents(schedule))
      .filter((event) => event.date.startsWith(monthKey))
      .reduce((sum, event) => sum + event.amount, 0)

    return {
      monthKey,
      label: `${date.getFullYear()}.${date.getMonth() + 1}`,
      paid,
    }
  })

  let max = 1
  for (const row of rows) {
    if (Math.abs(row.paid) > max) max = Math.abs(row.paid)
  }

  return rows.map((row) => ({
    ...row,
    percent: Math.max(14, Math.round((Math.abs(row.paid) / max) * 100)),
  }))
}

export const getIncomeSummary = (schedules: Schedule[], anchorDate = new Date()) => {
  const monthKey = getMonthKey(anchorDate)
  const paymentEvents = schedules
    .filter((schedule) => schedule.status !== 'cancelled')
    .flatMap((schedule) => getPaymentEvents(schedule))
  const monthPayments = paymentEvents.filter((event) => event.date.startsWith(monthKey))
  const pendingCustomers = schedules.filter((schedule) => schedule.status !== 'cancelled' && getRemainingAmount(schedule) > 0)

  return {
    received: monthPayments.reduce((sum, event) => sum + event.amount, 0),
    paymentCount: monthPayments.length,
    pending: pendingCustomers.reduce((sum, schedule) => sum + getRemainingAmount(schedule), 0),
    pendingCount: pendingCustomers.length,
    monthPayments,
  }
}

export const referenceImageGroups = referenceImageGroupOptions

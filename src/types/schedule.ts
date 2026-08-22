import { getTodayKey } from '../utils/date'

export type ServiceCategory = 'bridal' | 'daily'

export type BridalSubtype = 'engagement' | 'thanks' | 'departure' | 'early_makeup'

export type DailySubtype = 'on_camera' | 'western' | 'coaching'

export type ServiceSubtype = BridalSubtype | DailySubtype

export type ScheduleSlotKind = 'trial' | 'service'

export type ScheduleSlot = {
  id: string
  kind: ScheduleSlotKind
  subtype?: ServiceSubtype
  date: string
  startTime?: string
  endTime?: string
}

export type ScheduleStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type BrideStage =
  | 'inquiry'
  | 'first_deposit'
  | 'trial'
  | 'second_deposit'
  | 'final_payment'
  | 'completed'
  | 'cancelled'

export type JewelryNeed = 'none' | 'borrow'

export type ReferenceImageGroup = 'makeup' | 'jewelry' | 'outfit' | 'trial'

export type ReferenceImage = {
  id: string
  url: string
  name?: string
  group: ReferenceImageGroup
  createdAt: string
}

export type PaymentRecordKind = 'first_deposit' | 'trial_deposit' | 'final_payment' | 'other'

export type PaymentRecord = {
  id: string
  kind: PaymentRecordKind
  label: string
  date: string
  amount: number
  createdAt: string
}

export type Schedule = {
  id: string
  title: string
  serviceCategory: ServiceCategory
  serviceSubtype: ServiceSubtype
  date: string
  startTime?: string
  endTime?: string
  trialDate?: string
  trialStartTime?: string
  trialEndTime?: string
  serviceSlots?: ScheduleSlot[]
  status: ScheduleStatus
  customer?: string
  phone?: string
  location?: string
  amount?: number
  brideStage?: BrideStage
  outfitCount?: number
  jewelryNeed?: JewelryNeed
  jewelryItems?: string
  note?: string
  referenceImages?: ReferenceImage[]
  paymentRecords: PaymentRecord[]
  createdAt: string
  updatedAt: string
}

export type ScheduleDraft = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>

export type AppSettings = {
  id: 'default'
  lastBackupAt?: string
  createdAt: string
  updatedAt: string
}

export type BackupPayload = {
  version: 1
  exportedAt: string
  schedules: Schedule[]
  settings?: AppSettings
}

export type StatusTone = 'warning' | 'primary' | 'success' | 'default' | 'danger'

export const scheduleStatusOptions: Array<{
  value: ScheduleStatus
  label: string
  tone: StatusTone
}> = [
  { value: 'pending', label: '待确认', tone: 'warning' },
  { value: 'confirmed', label: '已确认', tone: 'primary' },
  { value: 'in_progress', label: '进行中', tone: 'success' },
  { value: 'completed', label: '已完成', tone: 'default' },
  { value: 'cancelled', label: '已取消', tone: 'danger' },
]

export const brideStageOptions: Array<{
  value: BrideStage
  label: string
  shortLabel: string
  tone: StatusTone
}> = [
  { value: 'inquiry', label: '咨询中', shortLabel: '咨询', tone: 'warning' },
  { value: 'first_deposit', label: '已收初定', shortLabel: '初定', tone: 'primary' },
  { value: 'trial', label: '已约试妆', shortLabel: '试妆', tone: 'primary' },
  { value: 'second_deposit', label: '试妆满意已复定', shortLabel: '复定', tone: 'success' },
  { value: 'final_payment', label: '待收尾款', shortLabel: '尾款', tone: 'warning' },
  { value: 'completed', label: '跟妆完成', shortLabel: '完成', tone: 'default' },
  { value: 'cancelled', label: '已取消', shortLabel: '取消', tone: 'danger' },
]

export const jewelryNeedOptions: Array<{ value: JewelryNeed; label: string }> = [
  { value: 'none', label: '不需要饰品' },
  { value: 'borrow', label: '工作室提供' },
]

export const referenceImageGroupOptions: Array<{
  value: ReferenceImageGroup
  title: string
  hint: string
}> = [
  { value: 'makeup', title: '想要的妆面', hint: '客人喜欢的妆容风格' },
  { value: 'jewelry', title: '想要的饰品', hint: '头饰 / 耳饰 / 手饰参考' },
  { value: 'outfit', title: '客人的服装', hint: '每套礼服 / 秀禾 / 婚纱' },
  { value: 'trial', title: '试妆照片', hint: '试妆当天记录' },
]

export const getStatusLabel = (status: ScheduleStatus) =>
  scheduleStatusOptions.find((option) => option.value === status)?.label ?? '待确认'

export const mapStatusToBrideStage = (status: ScheduleStatus): BrideStage => {
  if (status === 'confirmed') return 'first_deposit'
  if (status === 'in_progress') return 'trial'
  if (status === 'completed') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  return 'inquiry'
}

export const getScheduleBrideStage = (schedule: Pick<Schedule, 'brideStage' | 'status'>) =>
  schedule.brideStage ?? mapStatusToBrideStage(schedule.status)

export const getBrideStageLabel = (stage?: BrideStage) =>
  brideStageOptions.find((option) => option.value === stage)?.label ?? '咨询中'

export const getBrideStageTone = (stage?: BrideStage) =>
  brideStageOptions.find((option) => option.value === stage)?.tone ?? 'warning'

export const getJewelryNeedLabel = (need?: JewelryNeed) =>
  jewelryNeedOptions.find((option) => option.value === need)?.label ?? '未记录'

export const serviceCategoryOptions: Array<{ value: ServiceCategory; label: string }> = [
  { value: 'bridal', label: '跟妆' },
  { value: 'daily', label: '日常生活妆' },
]

export const bridalSubtypeOptions: Array<{ value: BridalSubtype; label: string }> = [
  { value: 'engagement', label: '订婚宴' },
  { value: 'thanks', label: '答谢宴' },
  { value: 'departure', label: '出阁宴' },
  { value: 'early_makeup', label: '新娘早妆' },
]

export const dailySubtypeOptions: Array<{ value: DailySubtype; label: string }> = [
  { value: 'on_camera', label: '上镜妆' },
  { value: 'western', label: '欧美妆' },
  { value: 'coaching', label: '美妆私教' },
]

const serviceSubtypeLabelMap: Record<ServiceSubtype, string> = {
  engagement: '订婚宴',
  thanks: '答谢宴',
  departure: '出阁宴',
  early_makeup: '新娘早妆',
  on_camera: '上镜妆',
  western: '欧美妆',
  coaching: '美妆私教',
}

export const isDailyMakeup = (schedule: Pick<Schedule, 'serviceCategory'>) =>
  schedule.serviceCategory === 'daily'

export const getServiceSubtypeLabel = (subtype: ServiceSubtype) =>
  serviceSubtypeLabelMap[subtype]

export const getServiceSubtypeOptions = (category: ServiceCategory) =>
  category === 'bridal' ? bridalSubtypeOptions : dailySubtypeOptions

export const getDefaultServiceSubtype = (category: ServiceCategory): ServiceSubtype =>
  category === 'bridal' ? 'early_makeup' : 'on_camera'

export const getBridalServiceSlotTitle = (subtype: BridalSubtype) =>
  subtype === 'early_makeup' ? '婚期跟妆' : '宴会跟妆'

export const getServiceCategoryLabel = (category: ServiceCategory) =>
  serviceCategoryOptions.find((option) => option.value === category)?.label ?? category

const sortScheduleSlots = (slots: ScheduleSlot[]) =>
  [...slots].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.kind !== b.kind) return a.kind === 'trial' ? -1 : 1
    const aTime = a.startTime ?? '99:99'
    const bTime = b.startTime ?? '99:99'
    return aTime.localeCompare(bTime)
  })

const legacySlotsFromSchedule = (schedule: Pick<Schedule, 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>): ScheduleSlot[] => {
  const slots: ScheduleSlot[] = []
  if (schedule.trialDate) {
    slots.push({
      id: 'trial',
      kind: 'trial',
      date: schedule.trialDate,
      startTime: schedule.trialStartTime,
      endTime: schedule.trialEndTime,
    })
  }
  if (schedule.date) {
    slots.push({
      id: 'service',
      kind: 'service',
      subtype: schedule.serviceSubtype,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    })
  }
  return slots
}

export const getScheduleSlots = (schedule: Pick<Schedule, 'serviceSlots' | 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>) => {
  const next = schedule.serviceSlots?.length ? schedule.serviceSlots : legacySlotsFromSchedule(schedule)
  return sortScheduleSlots(next.filter((slot) => Boolean(slot.date)))
}

export const getScheduleTrialSlots = (schedule: Pick<Schedule, 'serviceSlots' | 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>) =>
  getScheduleSlots(schedule).filter((slot) => slot.kind === 'trial')

export const getScheduleServiceSlots = (schedule: Pick<Schedule, 'serviceSlots' | 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>) =>
  getScheduleSlots(schedule).filter((slot) => slot.kind === 'service')

export const getSchedulePrimaryServiceSlot = (schedule: Pick<Schedule, 'serviceSlots' | 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>) =>
  getScheduleServiceSlots(schedule)[0] ?? getScheduleSlots(schedule)[0]

export const getScheduleCardSlot = (schedule: Pick<Schedule, 'serviceSlots' | 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>) => {
  const todayKey = getTodayKey()
  const upcomingSlot = getScheduleSlots(schedule).find((slot) => slot.date >= todayKey)
  return upcomingSlot ?? getSchedulePrimaryServiceSlot(schedule)
}

export const getScheduleCardServiceLine = (schedule: Schedule) => {
  const slot = getScheduleCardSlot(schedule)
  const serviceValue = slot
    ? getScheduleSlotLabel(slot, schedule.serviceSubtype)
    : getServiceSubtypeLabel(schedule.serviceSubtype)
  return `${serviceValue} · ${isDailyMakeup(schedule) ? 'Daily Look' : 'Signature Look'}`
}

export const getScheduleSlotDates = (schedule: Pick<Schedule, 'serviceSlots' | 'date' | 'startTime' | 'endTime' | 'trialDate' | 'trialStartTime' | 'trialEndTime' | 'serviceSubtype'>) => {
  const seen = new Set<string>()
  const dates: string[] = []
  for (const slot of getScheduleSlots(schedule)) {
    if (seen.has(slot.date)) continue
    seen.add(slot.date)
    dates.push(slot.date)
  }
  return dates
}

export const getScheduleSlotLabel = (slot: ScheduleSlot, fallbackSubtype?: ServiceSubtype) =>
  slot.kind === 'trial' ? '试妆' : getServiceSubtypeLabel(slot.subtype ?? fallbackSubtype ?? 'early_makeup')

export const getPaymentKindOptions = (category: ServiceCategory): Array<{
  value: PaymentRecordKind
  label: string
}> => {
  if (category === 'daily') {
    return [
      { value: 'first_deposit', label: '预约档期定金' },
      { value: 'final_payment', label: '服务尾款' },
      { value: 'other', label: '其他收款' },
    ]
  }

  return [
    { value: 'first_deposit', label: '试妆定金' },
    { value: 'trial_deposit', label: '复定定金' },
    { value: 'final_payment', label: '跟妆尾款' },
    { value: 'other', label: '其他收款' },
  ]
}

export const getPaymentKindLabel = (kind: PaymentRecordKind, category: ServiceCategory) =>
  getPaymentKindOptions(category).find((option) => option.value === kind)?.label ?? '收款'

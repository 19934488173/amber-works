export type ScheduleType =
  | 'work'
  | 'shoot'
  | 'makeup'
  | 'meeting'
  | 'personal'
  | 'other'

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

export type JewelryNeed = 'none' | 'borrow' | 'provided'

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
  date: string
  startTime?: string
  endTime?: string
  type: ScheduleType
  status: ScheduleStatus
  customer?: string
  phone?: string
  location?: string
  amount?: number
  paidAmount?: number
  firstDepositAmount?: number
  trialDepositAmount?: number
  finalPaymentAmount?: number
  firstDepositDate?: string
  trialDate?: string
  trialDepositDate?: string
  finalPaymentDate?: string
  brideStage?: BrideStage
  outfitCount?: number
  jewelryNeed?: JewelryNeed
  jewelryItems?: string
  note?: string
  referenceImages?: ReferenceImage[]
  paymentRecords?: PaymentRecord[]
  createdAt: string
  updatedAt: string
}

export type ScheduleDraft = Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>

export type Category = {
  id: ScheduleType
  label: string
  color: string
}

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

export const scheduleTypeOptions: Array<{
  value: ScheduleType
  label: string
  color: string
}> = [
  { value: 'makeup', label: '新娘跟妆', color: '#be185d' },
  { value: 'shoot', label: '试妆/拍摄', color: '#0f766e' },
  { value: 'work', label: '工作室事务', color: '#2563eb' },
  { value: 'meeting', label: '会议', color: '#7c3aed' },
  { value: 'personal', label: '私人', color: '#059669' },
  { value: 'other', label: '其他', color: '#64748b' },
]

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
  { value: 'provided', label: '客人自备' },
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

export const getTypeLabel = (type: ScheduleType) =>
  scheduleTypeOptions.find((option) => option.value === type)?.label ?? '其他'

export const getTypeColor = (type: ScheduleType) =>
  scheduleTypeOptions.find((option) => option.value === type)?.color ?? '#64748b'

export const getStatusLabel = (status: ScheduleStatus) =>
  scheduleStatusOptions.find((option) => option.value === status)?.label ?? '待确认'

export const getStatusTone = (status: ScheduleStatus) =>
  scheduleStatusOptions.find((option) => option.value === status)?.tone ?? 'warning'

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

export const getBrideStageShortLabel = (stage?: BrideStage) =>
  brideStageOptions.find((option) => option.value === stage)?.shortLabel ?? '咨询'

export const getBrideStageTone = (stage?: BrideStage) =>
  brideStageOptions.find((option) => option.value === stage)?.tone ?? 'warning'

export const getJewelryNeedLabel = (need?: JewelryNeed) =>
  jewelryNeedOptions.find((option) => option.value === need)?.label ?? '未记录'

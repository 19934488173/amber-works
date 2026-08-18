import { db, ensureAppDefaults } from './database'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type {
  AppSettings,
  BackupPayload,
  BrideStage,
  JewelryNeed,
  PaymentRecord,
  PaymentRecordKind,
  ReferenceImageGroup,
  Schedule,
  ScheduleDraft,
  ScheduleStatus,
  ServiceCategory,
  ServiceSubtype,
} from '../types/schedule'
import {
  bridalSubtypeOptions,
  brideStageOptions,
  dailySubtypeOptions,
  jewelryNeedOptions,
  mapStatusToBrideStage,
  referenceImageGroupOptions,
  scheduleStatusOptions,
  serviceCategoryOptions,
} from '../types/schedule'
import { sortSchedules } from '../utils/date'
import { getScheduleServiceSlots, getScheduleTrialSlots } from '../types/schedule'

const createId = () => crypto.randomUUID()
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined)

const asIsoString = (value: unknown, fallback: string) => {
  const next = asString(value)
  return next && !Number.isNaN(Date.parse(next)) ? next : fallback
}

const asDateKey = (value: unknown) => {
  const next = asString(value)
  return next && dateKeyPattern.test(next) ? next : undefined
}

const asPositiveNumber = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? next : undefined
}

const asNonZeroNumber = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next !== 0 ? next : undefined
}

const scheduleStatuses = scheduleStatusOptions.map((option) => option.value)
const serviceCategories = serviceCategoryOptions.map((option) => option.value)
const serviceSubtypes = [...bridalSubtypeOptions, ...dailySubtypeOptions].map((option) => option.value)
const brideStages = brideStageOptions.map((option) => option.value)
const jewelryNeeds = jewelryNeedOptions.map((option) => option.value)
const referenceImageGroups = referenceImageGroupOptions.map((option) => option.value)
const paymentRecordKinds: PaymentRecordKind[] = ['first_deposit', 'trial_deposit', 'final_payment', 'other']

const asOneOf = <T extends string>(value: unknown, options: readonly T[]) => {
  const next = asString(value)
  return next && options.includes(next as T) ? next as T : undefined
}

const asReferenceImageGroup = (value: unknown): ReferenceImageGroup =>
  asOneOf(value, referenceImageGroups) ?? 'makeup'

const normalizePaymentRecords = (records: unknown, createdAt: string): PaymentRecord[] => {
  if (!Array.isArray(records)) return []

  return records
    .filter(isPlainObject)
    .map((record) => ({
      id: asString(record.id) ?? createId(),
      kind: asOneOf(record.kind, paymentRecordKinds),
      label: asString(record.label) || '收款',
      date: asDateKey(record.date) ?? '',
      amount: asNonZeroNumber(record.amount) ?? 0,
      createdAt: asIsoString(record.createdAt, createdAt),
    }))
    .filter((record) =>
      record.kind
      && dateKeyPattern.test(record.date)
      && record.amount !== 0,
    ) as PaymentRecord[]
}

type NormalizedServiceSlot = {
  id: string
  kind: 'trial' | 'service'
  subtype?: ServiceSubtype
  date: string
  startTime?: string
  endTime?: string
}

const normalizeServiceSlots = (slots: unknown): NormalizedServiceSlot[] | undefined => {
  if (!Array.isArray(slots)) return undefined

  const next: NormalizedServiceSlot[] = []
  for (const slot of slots) {
    if (!isPlainObject(slot)) continue
    const date = asDateKey(slot.date)
    if (!date) continue
    next.push({
      id: asString(slot.id) ?? createId(),
      kind: asOneOf(slot.kind, ['trial', 'service'] as const) ?? 'service',
      subtype: asOneOf(slot.subtype, serviceSubtypes),
      date,
      startTime: asString(slot.startTime),
      endTime: asString(slot.endTime),
    })
  }

  return next.length ? next : undefined
}

const normalizeSchedule = (value: unknown): Schedule => {
  if (!isPlainObject(value)) throw new Error('备份文件包含无效档期')

  const id = asString(value.id) ?? createId()
  const now = new Date().toISOString()
  const date = asDateKey(value.date)
  if (!date) throw new Error('备份文件包含无效日期')

  const serviceCategory = asOneOf<ServiceCategory>(value.serviceCategory, serviceCategories)
  const serviceSubtype = asOneOf<ServiceSubtype>(value.serviceSubtype, serviceSubtypes)
  if (!serviceCategory || !serviceSubtype) throw new Error('备份文件包含无效客户类型')

  const status = asOneOf<ScheduleStatus>(value.status, scheduleStatuses)

  return {
    id,
    title: asString(value.title) || '未命名档期',
    serviceCategory,
    serviceSubtype,
    date,
    startTime: asString(value.startTime),
    endTime: asString(value.endTime),
    status: status ?? 'pending',
    customer: asString(value.customer),
    phone: asString(value.phone),
    location: asString(value.location),
    amount: asPositiveNumber(value.amount),
    trialDate: asDateKey(value.trialDate),
    trialStartTime: asString(value.trialStartTime),
    trialEndTime: asString(value.trialEndTime),
    serviceSlots: normalizeServiceSlots((value as Record<string, unknown>).serviceSlots),
    brideStage: asOneOf<BrideStage>(value.brideStage, brideStages),
    outfitCount: asPositiveNumber(value.outfitCount),
    jewelryNeed: asOneOf<JewelryNeed>(value.jewelryNeed, jewelryNeeds),
    jewelryItems: asString(value.jewelryItems),
    note: asString(value.note),
    referenceImages: Array.isArray(value.referenceImages)
      ? value.referenceImages.filter(isPlainObject).map((image) => ({
        id: asString(image.id) ?? createId(),
        url: asString(image.url) ?? '',
        name: asString(image.name),
        group: asReferenceImageGroup(image.group),
        createdAt: asIsoString(image.createdAt, now),
      })).filter((image) => image.url)
      : [],
    paymentRecords: normalizePaymentRecords(value.paymentRecords, now),
    createdAt: asIsoString(value.createdAt, now),
    updatedAt: asIsoString(value.updatedAt, now),
  }
}

const normalizeDraft = (draft: ScheduleDraft): ScheduleDraft => ({
  ...draft,
  paymentRecords: normalizePaymentRecords(draft.paymentRecords, new Date().toISOString()),
})

export const localScheduleRepository = {
  async initialize() {
    await ensureAppDefaults()
  },

  async list() {
    return sortSchedules(await db.schedules.toArray())
  },

  async get(id: string) {
    return db.schedules.get(id)
  },

  async create(draft: ScheduleDraft) {
    const now = new Date().toISOString()
    const schedule: Schedule = {
      ...normalizeDraft(draft),
      id: createId(),
      createdAt: now,
      updatedAt: now,
    }
    await db.schedules.add(schedule)
    return schedule
  },

  async update(id: string, draft: ScheduleDraft) {
    const existing = await db.schedules.get(id)
    if (!existing) throw new Error('档期不存在')

    const next: Schedule = {
      ...existing,
      ...normalizeDraft(draft),
      id,
      updatedAt: new Date().toISOString(),
    }

    await db.schedules.put(next)
    return next
  },

  async updateStatus(id: string, status: Schedule['status']) {
    await db.schedules.update(id, { status, brideStage: mapStatusToBrideStage(status), updatedAt: new Date().toISOString() })
  },

  async remove(id: string) {
    await db.schedules.delete(id)
  },

  async duplicate(source: Schedule, date: string) {
    const trialSlots = getScheduleTrialSlots(source)
    const serviceSlots = getScheduleServiceSlots(source)
    return this.create({
      title: source.title,
      serviceCategory: source.serviceCategory,
      serviceSubtype: source.serviceSubtype,
      date,
      startTime: source.startTime,
      endTime: source.endTime,
      status: 'pending',
      customer: source.customer,
      phone: source.phone,
      location: source.location,
      amount: source.amount,
      trialDate: source.trialDate,
      trialStartTime: source.trialStartTime,
      trialEndTime: source.trialEndTime,
      serviceSlots: [
        ...trialSlots.map((slot) => ({ ...slot })),
        ...serviceSlots.map((slot, index) => ({ ...slot, date: index === 0 ? date : slot.date })),
      ],
      brideStage: 'inquiry',
      outfitCount: source.outfitCount,
      jewelryNeed: source.jewelryNeed,
      jewelryItems: source.jewelryItems,
      note: source.note,
      referenceImages: [],
      paymentRecords: [],
    })
  },

  async getSettings() {
    await ensureAppDefaults()
    return db.settings.get('default') as Promise<AppSettings>
  },

  async exportBackup(): Promise<BackupPayload> {
    await ensureAppDefaults()
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      schedules: await this.list(),
      settings: await this.getSettings(),
    }
  },

  async importBackup(payload: BackupPayload) {
    if (payload.version !== 1 || !Array.isArray(payload.schedules)) {
      throw new Error('备份文件格式不正确')
    }

    const now = new Date().toISOString()
    const schedules = payload.schedules.map(normalizeSchedule)
    await db.transaction('rw', db.schedules, db.settings, async () => {
      await db.schedules.clear()
      await db.schedules.bulkPut(schedules)
      await db.settings.put({
        id: 'default',
        createdAt: payload.settings?.createdAt ?? now,
        updatedAt: now,
        lastBackupAt: now,
      })
    })
  },

  async clearAll() {
    const now = new Date().toISOString()
    const existing = await db.settings.get('default')
    await db.transaction('rw', db.schedules, db.settings, async () => {
      await db.schedules.clear()
      await db.settings.put({
        id: 'default',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        lastBackupAt: existing?.lastBackupAt,
      })
    })
  },

  async markBackupNow() {
    const now = new Date().toISOString()
    await db.settings.put({
      id: 'default',
      createdAt: (await this.getSettings()).createdAt,
      updatedAt: now,
      lastBackupAt: now,
    })
  },
}

type Repository = typeof localScheduleRepository

type CloudScheduleRow = {
  id: string
  user_id: string
  date: string
  trial_date: string | null
  status: Schedule['status']
  service_category: Schedule['serviceCategory']
  data: Schedule
  created_at: string
  updated_at: string
}

type CloudSettingsRow = {
  user_id: string
  data: AppSettings
  created_at: string
  updated_at: string
}




type ReplaceUserBackupParams = {
  p_schedules: CloudScheduleRow[]
  p_settings: CloudSettingsRow
}

const assertSupabase = () => {
  if (!supabase) throw new Error('还没有配置 Supabase')
  return supabase
}

const throwCloudError = (error: { message: string } | null, fallback: string) => {
  if (error) throw new Error(`${fallback}：${error.message}`)
}

const isMissingCloudFunctionError = (error: { message: string } | null) =>
  Boolean(error?.message.includes('replace_user_backup'))

const throwConflictError = () => {
  throw new Error('云端数据已被其他设备修改，请刷新后再试')
}

const normalizeCloudScheduleRow = (row: Pick<CloudScheduleRow, 'data' | 'updated_at'>) =>
  normalizeSchedule({ ...row.data, updatedAt: row.updated_at })

const getCloudUserId = async () => {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`读取登录状态失败：${error.message}`)
  return data.user?.id ?? null
}

const createScheduleRow = (userId: string, schedule: Schedule): CloudScheduleRow => ({
  id: schedule.id,
  user_id: userId,
  date: schedule.date,
  trial_date: schedule.trialDate ?? null,
  status: schedule.status,
  service_category: schedule.serviceCategory,
  data: schedule,
  created_at: schedule.createdAt,
  updated_at: schedule.updatedAt,
})

const createSettingsRow = (userId: string, settings: AppSettings): CloudSettingsRow => ({
  user_id: userId,
  data: settings,
  created_at: settings.createdAt,
  updated_at: settings.updatedAt,
})

const createCloudRepository = (userId: string): Repository => ({
  async initialize() {
    await this.getSettings()
  },

  async list() {
    const client = assertSupabase()
    const { data, error } = await client
      .from('schedules')
      .select('data, updated_at')
      .eq('user_id', userId)

    throwCloudError(error, '读取云端档期失败')
    return sortSchedules((data ?? []).map((row) => normalizeCloudScheduleRow(row)))
  },

  async get(id: string) {
    const client = assertSupabase()
    const { data, error } = await client
      .from('schedules')
      .select('data, updated_at')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()

    throwCloudError(error, '读取云端档期失败')
    return data ? normalizeCloudScheduleRow(data) : undefined
  },

  async create(draft: ScheduleDraft) {
    const now = new Date().toISOString()
    const schedule: Schedule = {
      ...normalizeDraft(draft),
      id: createId(),
      createdAt: now,
      updatedAt: now,
    }

    const client = assertSupabase()
    const { error } = await client.from('schedules').insert(createScheduleRow(userId, schedule))
    throwCloudError(error, '保存云端档期失败')
    return schedule
  },

  async update(id: string, draft: ScheduleDraft) {
    const existing = await this.get(id)
    if (!existing) throw new Error('档期不存在')

    const next: Schedule = {
      ...existing,
      ...normalizeDraft(draft),
      id,
      updatedAt: new Date().toISOString(),
    }

    const client = assertSupabase()
    const { data, error } = await client
      .from('schedules')
      .update(createScheduleRow(userId, next))
      .eq('user_id', userId)
      .eq('id', id)
      .eq('updated_at', existing.updatedAt)
      .select('id')
      .maybeSingle()

    throwCloudError(error, '更新云端档期失败')
    if (!data) throwConflictError()
    return next
  },

  async updateStatus(id: string, status: Schedule['status']) {
    const existing = await this.get(id)
    if (!existing) throw new Error('档期不存在')

    const next: Schedule = {
      ...existing,
      status,
      brideStage: mapStatusToBrideStage(status),
      updatedAt: new Date().toISOString(),
    }

    const client = assertSupabase()
    const { data, error } = await client
      .from('schedules')
      .update(createScheduleRow(userId, next))
      .eq('user_id', userId)
      .eq('id', id)
      .eq('updated_at', existing.updatedAt)
      .select('id')
      .maybeSingle()

    throwCloudError(error, '更新云端状态失败')
    if (!data) throwConflictError()
  },

  async remove(id: string) {
    const client = assertSupabase()
    const { error } = await client
      .from('schedules')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)

    throwCloudError(error, '删除云端档期失败')
  },

  async duplicate(source: Schedule, date: string) {
    const trialSlots = getScheduleTrialSlots(source)
    const serviceSlots = getScheduleServiceSlots(source)
    return this.create({
      title: source.title,
      serviceCategory: source.serviceCategory,
      serviceSubtype: source.serviceSubtype,
      date,
      startTime: source.startTime,
      endTime: source.endTime,
      status: 'pending',
      customer: source.customer,
      phone: source.phone,
      location: source.location,
      amount: source.amount,
      trialDate: source.trialDate,
      trialStartTime: source.trialStartTime,
      trialEndTime: source.trialEndTime,
      serviceSlots: [
        ...trialSlots.map((slot) => ({ ...slot })),
        ...serviceSlots.map((slot, index) => ({ ...slot, date: index === 0 ? date : slot.date })),
      ],
      brideStage: 'inquiry',
      outfitCount: source.outfitCount,
      jewelryNeed: source.jewelryNeed,
      jewelryItems: source.jewelryItems,
      note: source.note,
      referenceImages: [],
      paymentRecords: [],
    })
  },

  async getSettings() {
    const client = assertSupabase()
    const { data, error } = await client
      .from('app_settings')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()

    throwCloudError(error, '读取云端设置失败')
    if (data?.data) return data.data as AppSettings

    const now = new Date().toISOString()
    const settings: AppSettings = { id: 'default', createdAt: now, updatedAt: now }
    const { error: upsertError } = await client
      .from('app_settings')
      .upsert(createSettingsRow(userId, settings), { onConflict: 'user_id' })

    throwCloudError(upsertError, '初始化云端设置失败')
    return settings
  },

  async exportBackup(): Promise<BackupPayload> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      schedules: await this.list(),
      settings: await this.getSettings(),
    }
  },

  async importBackup(payload: BackupPayload) {
    if (payload.version !== 1 || !Array.isArray(payload.schedules)) {
      throw new Error('备份文件格式不正确')
    }

    const client = assertSupabase()
    const now = new Date().toISOString()
    const schedules = payload.schedules.map(normalizeSchedule)
    const settings: AppSettings = {
      id: 'default',
      createdAt: payload.settings?.createdAt ?? now,
      updatedAt: now,
      lastBackupAt: payload.settings?.lastBackupAt,
    }

    const { error } = await client.rpc('replace_user_backup', {
      p_schedules: schedules.map((schedule) => createScheduleRow(userId, schedule)),
      p_settings: createSettingsRow(userId, settings),
    } satisfies ReplaceUserBackupParams)

    throwCloudError(error, '导入云端备份失败')
  },

  async clearAll() {
    const client = assertSupabase()
    const now = new Date().toISOString()
    const existing = await this.getSettings()

    const params: ReplaceUserBackupParams = {
      p_schedules: [],
      p_settings: createSettingsRow(userId, {
        id: 'default',
        createdAt: existing.createdAt,
        updatedAt: now,
        lastBackupAt: existing.lastBackupAt,
      }),
    }

    const { error } = await client.rpc('replace_user_backup', params)
    if (isMissingCloudFunctionError(error)) {
      const { error: deleteError } = await client
        .from('schedules')
        .delete()
        .eq('user_id', userId)

      throwCloudError(deleteError, '清空云端数据失败')

      const { error: settingsError } = await client
        .from('app_settings')
        .upsert(params.p_settings, { onConflict: 'user_id' })

      throwCloudError(settingsError, '清空云端数据失败')
      return
    }

    throwCloudError(error, '清空云端数据失败')
  },

  async markBackupNow() {
    const now = new Date().toISOString()
    const settings = await this.getSettings()
    const client = assertSupabase()
    const { error } = await client
      .from('app_settings')
      .upsert(createSettingsRow(userId, {
        id: 'default',
        createdAt: settings.createdAt,
        updatedAt: now,
        lastBackupAt: now,
      }), { onConflict: 'user_id' })

    throwCloudError(error, '更新备份时间失败')
  },
})

const getActiveRepository = async (knownUserId?: string | null) => {
  const userId = knownUserId ?? await getCloudUserId()
  return userId ? createCloudRepository(userId) : localScheduleRepository
}

export const createScheduleRepository = (knownUserId?: string | null) => ({
  async initialize() {
    await (await getActiveRepository(knownUserId)).initialize()
  },

  async list() {
    return (await getActiveRepository(knownUserId)).list()
  },

  async get(id: string) {
    return (await getActiveRepository(knownUserId)).get(id)
  },

  async create(draft: ScheduleDraft) {
    return (await getActiveRepository(knownUserId)).create(draft)
  },

  async update(id: string, draft: ScheduleDraft) {
    return (await getActiveRepository(knownUserId)).update(id, draft)
  },

  async updateStatus(id: string, status: Schedule['status']) {
    return (await getActiveRepository(knownUserId)).updateStatus(id, status)
  },

  async remove(id: string) {
    return (await getActiveRepository(knownUserId)).remove(id)
  },

  async duplicate(source: Schedule, date: string) {
    return (await getActiveRepository(knownUserId)).duplicate(source, date)
  },

  async getSettings() {
    return (await getActiveRepository(knownUserId)).getSettings()
  },

  async exportBackup() {
    return (await getActiveRepository(knownUserId)).exportBackup()
  },

  async importBackup(payload: BackupPayload) {
    return (await getActiveRepository(knownUserId)).importBackup(payload)
  },

  async clearAll() {
    return (await getActiveRepository(knownUserId)).clearAll()
  },

  async markBackupNow() {
    return (await getActiveRepository(knownUserId)).markBackupNow()
  },

  async uploadLocalDataToCloud() {
    const userId = knownUserId ?? await getCloudUserId()
    if (!userId) throw new Error('请先登录账号')
    const payload = await localScheduleRepository.exportBackup()
    await createCloudRepository(userId).importBackup(payload)
  },
})

export const scheduleRepository = createScheduleRepository()

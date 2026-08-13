import { db, ensureAppDefaults } from './database'
import type { AppSettings, BackupPayload, PaymentRecord, ReferenceImageGroup, Schedule, ScheduleDraft } from '../types/schedule'
import { mapStatusToBrideStage } from '../types/schedule'
import { sortSchedules } from '../utils/date'
import { getPaymentEvents } from '../utils/statistics'

const createId = () => crypto.randomUUID()
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined)

const asDateKey = (value: unknown) => {
  const next = asString(value)
  return next && dateKeyPattern.test(next) ? next : undefined
}

const asPositiveNumber = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? next : undefined
}

const referenceImageGroups: ReferenceImageGroup[] = ['makeup', 'jewelry', 'outfit', 'trial']

const asReferenceImageGroup = (value: unknown): ReferenceImageGroup =>
  referenceImageGroups.includes(value as ReferenceImageGroup) ? value as ReferenceImageGroup : 'makeup'

const normalizePaymentRecords = (schedule: Schedule): PaymentRecord[] => {
  if (schedule.paymentRecords?.length) {
    return schedule.paymentRecords
      .map((record) => ({
        id: record.id || createId(),
        kind: record.kind,
        label: record.label || '收款',
        date: record.date,
        amount: Number(record.amount),
        createdAt: record.createdAt || schedule.createdAt,
      }))
      .filter((record) => dateKeyPattern.test(record.date) && Number.isFinite(record.amount) && record.amount > 0)
  }

  return getPaymentEvents(schedule).map((event) => ({
    id: createId(),
    kind: event.type === 'legacy_paid' ? 'other' : event.type,
    label: event.label,
    date: event.date,
    amount: event.amount,
    createdAt: schedule.createdAt,
  }))
}

const normalizeSchedule = (value: unknown): Schedule => {
  if (!isPlainObject(value)) throw new Error('备份文件包含无效档期')

  const id = asString(value.id) ?? createId()
  const now = new Date().toISOString()
  const date = asDateKey(value.date)
  if (!date) throw new Error('备份文件包含无效日期')

  const status = asString(value.status) as Schedule['status'] | undefined
  const type = asString(value.type) as Schedule['type'] | undefined
  const schedule: Schedule = {
    id,
    title: asString(value.title) || '未命名档期',
    date,
    startTime: asString(value.startTime),
    endTime: asString(value.endTime),
    type: type ?? 'makeup',
    status: status ?? 'pending',
    customer: asString(value.customer),
    phone: asString(value.phone),
    location: asString(value.location),
    amount: asPositiveNumber(value.amount),
    paidAmount: asPositiveNumber(value.paidAmount),
    firstDepositAmount: asPositiveNumber(value.firstDepositAmount),
    trialDepositAmount: asPositiveNumber(value.trialDepositAmount),
    finalPaymentAmount: asPositiveNumber(value.finalPaymentAmount),
    firstDepositDate: asDateKey(value.firstDepositDate),
    trialDate: asDateKey(value.trialDate),
    trialDepositDate: asDateKey(value.trialDepositDate),
    finalPaymentDate: asDateKey(value.finalPaymentDate),
    brideStage: asString(value.brideStage) as Schedule['brideStage'],
    outfitCount: asPositiveNumber(value.outfitCount),
    jewelryNeed: asString(value.jewelryNeed) as Schedule['jewelryNeed'],
    jewelryItems: asString(value.jewelryItems),
    note: asString(value.note),
    referenceImages: Array.isArray(value.referenceImages)
      ? value.referenceImages.filter(isPlainObject).map((image) => ({
        id: asString(image.id) ?? createId(),
        url: asString(image.url) ?? '',
        name: asString(image.name),
        group: asReferenceImageGroup(image.group),
        createdAt: asString(image.createdAt) ?? now,
      })).filter((image) => image.url)
      : [],
    paymentRecords: [],
    createdAt: asString(value.createdAt) ?? now,
    updatedAt: asString(value.updatedAt) ?? now,
  }

  schedule.paymentRecords = normalizePaymentRecords(schedule)
  return schedule
}

const normalizeDraft = (draft: ScheduleDraft): ScheduleDraft => {
  const base = {
    ...draft,
    paymentRecords: normalizePaymentRecords({
      ...draft,
      id: createId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  }

  return {
    ...base,
    paidAmount: undefined,
    firstDepositAmount: undefined,
    trialDepositAmount: undefined,
    finalPaymentAmount: undefined,
    firstDepositDate: undefined,
    trialDepositDate: undefined,
    finalPaymentDate: undefined,
  }
}

export const scheduleRepository = {
  async initialize() {
    await ensureAppDefaults()
    const schedules = await db.schedules.toArray()
    const normalized = schedules.map(normalizeSchedule)
    const needsMigration = schedules.some((schedule, index) =>
      !schedule.paymentRecords?.length && normalized[index].paymentRecords?.length,
    )
    if (needsMigration) {
      await db.schedules.bulkPut(normalized)
    }
  },

  async list() {
    return sortSchedules(await db.schedules.toArray())
  },

  async byDate(date: string) {
    return sortSchedules(await db.schedules.where('date').equals(date).toArray())
  },

  async between(startDate: string, endDate: string) {
    return sortSchedules(
      await db.schedules.where('date').between(startDate, endDate, true, true).toArray(),
    )
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
    return this.create({
      title: source.title,
      date,
      startTime: source.startTime,
      endTime: source.endTime,
      type: source.type,
      status: 'pending',
      customer: source.customer,
      phone: source.phone,
      location: source.location,
      amount: source.amount,
      paidAmount: undefined,
      firstDepositAmount: undefined,
      trialDepositAmount: undefined,
      finalPaymentAmount: undefined,
      firstDepositDate: undefined,
      trialDate: source.trialDate,
      trialDepositDate: undefined,
      finalPaymentDate: undefined,
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

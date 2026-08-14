import { db, ensureAppDefaults } from './database'
import type { AppSettings, BackupPayload, PaymentRecord, ReferenceImageGroup, Schedule, ScheduleDraft } from '../types/schedule'
import { mapStatusToBrideStage } from '../types/schedule'
import { sortSchedules } from '../utils/date'

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

const normalizePaymentRecords = (records: unknown, createdAt: string): PaymentRecord[] => {
  if (!Array.isArray(records)) return []

  return records
    .filter(isPlainObject)
    .map((record) => ({
      id: asString(record.id) ?? createId(),
      kind: asString(record.kind) as PaymentRecord['kind'],
      label: asString(record.label) || '收款',
      date: asDateKey(record.date) ?? '',
      amount: Number(record.amount),
      createdAt: asString(record.createdAt) ?? createdAt,
    }))
    .filter((record) =>
      ['first_deposit', 'trial_deposit', 'final_payment', 'other'].includes(record.kind)
      && dateKeyPattern.test(record.date)
      && Number.isFinite(record.amount)
      && record.amount > 0,
    )
}

const normalizeSchedule = (value: unknown): Schedule => {
  if (!isPlainObject(value)) throw new Error('备份文件包含无效档期')

  const id = asString(value.id) ?? createId()
  const now = new Date().toISOString()
  const date = asDateKey(value.date)
  if (!date) throw new Error('备份文件包含无效日期')

  const serviceCategory = asString(value.serviceCategory) as Schedule['serviceCategory']
  const serviceSubtype = asString(value.serviceSubtype) as Schedule['serviceSubtype']
  if (!serviceCategory || !serviceSubtype) throw new Error('备份文件包含无效客户类型')

  const status = asString(value.status) as Schedule['status'] | undefined
  const type = asString(value.type) as Schedule['type'] | undefined

  return {
    id,
    title: asString(value.title) || '未命名档期',
    serviceCategory,
    serviceSubtype,
    date,
    startTime: asString(value.startTime),
    endTime: asString(value.endTime),
    type: type ?? 'makeup',
    status: status ?? 'pending',
    customer: asString(value.customer),
    phone: asString(value.phone),
    location: asString(value.location),
    amount: asPositiveNumber(value.amount),
    trialDate: asDateKey(value.trialDate),
    trialStartTime: asString(value.trialStartTime),
    trialEndTime: asString(value.trialEndTime),
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
    paymentRecords: normalizePaymentRecords(value.paymentRecords, now),
    createdAt: asString(value.createdAt) ?? now,
    updatedAt: asString(value.updatedAt) ?? now,
  }
}

const normalizeDraft = (draft: ScheduleDraft): ScheduleDraft => ({
  ...draft,
  paymentRecords: normalizePaymentRecords(draft.paymentRecords, new Date().toISOString()),
})

export const scheduleRepository = {
  async initialize() {
    await ensureAppDefaults()
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
      serviceCategory: source.serviceCategory,
      serviceSubtype: source.serviceSubtype,
      date,
      startTime: source.startTime,
      endTime: source.endTime,
      type: source.type,
      status: 'pending',
      customer: source.customer,
      phone: source.phone,
      location: source.location,
      amount: source.amount,
      trialDate: source.trialDate,
      trialStartTime: source.trialStartTime,
      trialEndTime: source.trialEndTime,
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

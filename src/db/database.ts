import Dexie, { type Table } from 'dexie'
import type { AppSettings, Category, Schedule } from '../types/schedule'
import { scheduleTypeOptions } from '../types/schedule'

class ScheduleDatabase extends Dexie {
  schedules!: Table<Schedule, string>
  settings!: Table<AppSettings, string>
  categories!: Table<Category, string>

  constructor() {
    super('personal-schedule-ledger')

    this.version(1).stores({
      schedules: 'id, date, status, type, updatedAt',
      settings: 'id',
      categories: 'id',
    })

    this.version(2).stores({
      schedules: 'id, date, trialDate, status, type, updatedAt',
      settings: 'id',
      categories: 'id',
    })
  }
}

export const db = new ScheduleDatabase()

export const ensureAppDefaults = async () => {
  const now = new Date().toISOString()
  const existingSettings = await db.settings.get('default')

  if (!existingSettings) {
    await db.settings.put({ id: 'default', createdAt: now, updatedAt: now })
  }

  const existingCategories = await db.categories.count()
  if (existingCategories === 0) {
    await db.categories.bulkPut(
      scheduleTypeOptions.map((option) => ({
        id: option.value,
        label: option.label,
        color: option.color,
      })),
    )
  }
}

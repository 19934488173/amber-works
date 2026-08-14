import Dexie, { type Table } from 'dexie'
import type { AppSettings, Schedule } from '../types/schedule'

class ScheduleDatabase extends Dexie {
  schedules!: Table<Schedule, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('kang-studio-ledger')

    this.version(1).stores({
      schedules: 'id, date, trialDate, status, serviceCategory, updatedAt',
      settings: 'id',
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
}

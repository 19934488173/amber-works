import type { Schedule, ScheduleSlot } from '../../types/schedule'
import {
  getScheduleCardServiceLine,
  getScheduleSlotLabel,
  getScheduleTrialSlots,
  isDailyMakeup,
} from '../../types/schedule'
import { getTodayKey } from '../../utils/date'
import { getCustomerName } from '../../app/bridalData'

export type AppointmentCardDraft = {
  customerName: string
  serviceLine: string
}

const getTrialServiceLine = (schedule: Schedule, trialSlot: ScheduleSlot) => {
  const serviceValue = getScheduleSlotLabel(trialSlot, schedule.serviceSubtype)
  return `${serviceValue} · ${isDailyMakeup(schedule) ? 'Daily Look' : 'Signature Look'}`
}

export const getDefaultAppointmentCardDraft = (schedule: Schedule): AppointmentCardDraft => {
  const upcomingTrialSlot = getScheduleTrialSlots(schedule).find(
    (slot) => slot.date >= getTodayKey(),
  )
  return {
    customerName: getCustomerName(schedule),
    serviceLine: upcomingTrialSlot
      ? getTrialServiceLine(schedule, upcomingTrialSlot)
      : getScheduleCardServiceLine(schedule),
  }
}

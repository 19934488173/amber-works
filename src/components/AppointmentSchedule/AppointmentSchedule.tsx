import type { BridalSubtype } from '../../types/schedule'
import { getBridalServiceSlotTitle } from '../../types/schedule'
import { formatAppointmentDate, formatAppointmentTime } from '../../utils/date'

export type AppointmentSlot = {
  date?: Date
  startTime?: string
  endTime?: string
}

type SlotProps = {
  step: string
  title: string
  hint: string
  slot: AppointmentSlot
  required?: boolean
  onPickDate: () => void
  onPickStartTime: () => void
  onPickEndTime: () => void
}

const AppointmentSlotCard = ({
  step,
  title,
  hint,
  slot,
  required = false,
  onPickDate,
  onPickStartTime,
  onPickEndTime,
}: SlotProps) => (
  <div className="appointment-slot">
    <div className="appointment-slot__head">
      <span className="appointment-slot__step">{step}</span>
      <div className="appointment-slot__titles">
        <strong>
          {title}
          {required ? <em>*</em> : null}
        </strong>
        <span>{hint}</span>
      </div>
    </div>

    <button type="button" className="appointment-slot__date" onClick={onPickDate}>
      <span>{formatAppointmentDate(slot.date)}</span>
    </button>

    <div className="appointment-slot__times">
      <button type="button" className="appointment-slot__time" onClick={onPickStartTime}>
        <small>开始</small>
        <strong>{formatAppointmentTime(slot.startTime)}</strong>
      </button>
      <span className="appointment-slot__dash" aria-hidden="true" />
      <button type="button" className="appointment-slot__time" onClick={onPickEndTime}>
        <small>结束</small>
        <strong>{formatAppointmentTime(slot.endTime)}</strong>
      </button>
    </div>
  </div>
)

type BridalProps = {
  subtype: BridalSubtype
  trial: AppointmentSlot
  service: AppointmentSlot
  onPickTrialDate: () => void
  onPickServiceDate: () => void
  onPickTrialStartTime: () => void
  onPickTrialEndTime: () => void
  onPickServiceStartTime: () => void
  onPickServiceEndTime: () => void
}

export const BridalAppointmentSchedule = ({
  subtype,
  trial,
  service,
  onPickTrialDate,
  onPickServiceDate,
  onPickTrialStartTime,
  onPickTrialEndTime,
  onPickServiceStartTime,
  onPickServiceEndTime,
}: BridalProps) => (
  <div className="appointment-schedule">
    <div className="appointment-schedule__intro">
      <strong>档期安排</strong>
      <span>先试妆确认效果，再锁定跟妆当天</span>
    </div>

    <AppointmentSlotCard
      step="1"
      title="试妆预约"
      hint="沟通妆容风格，确认是否满意"
      slot={trial}
      onPickDate={onPickTrialDate}
      onPickStartTime={onPickTrialStartTime}
      onPickEndTime={onPickTrialEndTime}
    />

    <AppointmentSlotCard
      step="2"
      title={getBridalServiceSlotTitle(subtype)}
      hint="试妆满意并复定后，确认当天跟妆"
      slot={service}
      required
      onPickDate={onPickServiceDate}
      onPickStartTime={onPickServiceStartTime}
      onPickEndTime={onPickServiceEndTime}
    />
  </div>
)

type DailyProps = {
  slot: AppointmentSlot
  onPickDate: () => void
  onPickStartTime: () => void
  onPickEndTime: () => void
}

export const DailyAppointmentSchedule = ({
  slot,
  onPickDate,
  onPickStartTime,
  onPickEndTime,
}: DailyProps) => (
  <div className="appointment-schedule">
    <div className="appointment-schedule__intro">
      <strong>服务预约</strong>
      <span>确认到店或服务上门时间</span>
    </div>

    <AppointmentSlotCard
      step="1"
      title="预约时间"
      hint="锁定档期需收取预约定金"
      slot={slot}
      required
      onPickDate={onPickDate}
      onPickStartTime={onPickStartTime}
      onPickEndTime={onPickEndTime}
    />
  </div>
)

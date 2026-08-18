import type { ReactNode } from "react";
import { AddCircleOutline, DeleteOutline } from "antd-mobile-icons";
import type { BridalSubtype } from "../../types/schedule";
import {
  bridalSubtypeOptions,
  getBridalServiceSlotTitle,
  getServiceSubtypeLabel,
} from "../../types/schedule";
import { formatAppointmentDate, formatAppointmentTime } from "../../utils/date";

export type AppointmentSlot = {
  id?: string;
  subtype?: BridalSubtype;
  date?: Date;
  startTime?: string;
  endTime?: string;
};

type SlotProps = {
  step: string;
  title: string;
  hint: string;
  slot: AppointmentSlot;
  required?: boolean;
  action?: ReactNode;
  children?: ReactNode;
  onPickDate: () => void;
  onPickStartTime: () => void;
  onPickEndTime: () => void;
};

const AppointmentSlotCard = ({
  step,
  title,
  hint,
  slot,
  required = false,
  action,
  children,
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
      {action ? <div className="appointment-slot__action">{action}</div> : null}
    </div>

    {children}

    <button
      type="button"
      className="appointment-slot__date"
      onClick={onPickDate}
    >
      <span>{formatAppointmentDate(slot.date)}</span>
    </button>

    <div className="appointment-slot__times">
      <button
        type="button"
        className="appointment-slot__time"
        onClick={onPickStartTime}
      >
        <small>开始</small>
        <strong>{formatAppointmentTime(slot.startTime)}</strong>
      </button>
      <span className="appointment-slot__dash" aria-hidden="true" />
      <button
        type="button"
        className="appointment-slot__time"
        onClick={onPickEndTime}
      >
        <small>结束</small>
        <strong>{formatAppointmentTime(slot.endTime)}</strong>
      </button>
    </div>
  </div>
);

type BridalServiceSlot = AppointmentSlot & {
  id: string;
  subtype: BridalSubtype;
};

type BridalProps = {
  subtype: BridalSubtype;
  trial: AppointmentSlot;
  services: BridalServiceSlot[];
  onPickTrialDate: () => void;
  onPickServiceDate: (id: string) => void;
  onPickTrialStartTime: () => void;
  onPickTrialEndTime: () => void;
  onPickServiceStartTime: (id: string) => void;
  onPickServiceEndTime: (id: string) => void;
  onChangeServiceSubtype: (id: string, subtype: BridalSubtype) => void;
  onAddService: () => void;
  onRemoveService: (id: string) => void;
};

export const BridalAppointmentSchedule = ({
  subtype,
  trial,
  services,
  onPickTrialDate,
  onPickServiceDate,
  onPickTrialStartTime,
  onPickTrialEndTime,
  onPickServiceStartTime,
  onPickServiceEndTime,
  onChangeServiceSubtype,
  onAddService,
  onRemoveService,
}: BridalProps) => (
  <div className="appointment-schedule">
    <div className="appointment-schedule__intro">
      <strong>档期安排</strong>
    </div>

    <AppointmentSlotCard
      step="1"
      title="试妆预约"
      hint="通常按 10:00 - 18:00 预留整天"
      slot={trial}
      onPickDate={onPickTrialDate}
      onPickStartTime={onPickTrialStartTime}
      onPickEndTime={onPickTrialEndTime}
    />

    {services.map((service, index) => (
      <AppointmentSlotCard
        key={service.id}
        step={`${index + 2}`}
        title={getServiceSubtypeLabel(service.subtype ?? subtype)}
        hint={getBridalServiceSlotTitle(service.subtype ?? subtype)}
        slot={service}
        required={index === 0}
        action={
          services.length > 1 ? (
            <button
              type="button"
              className="appointment-slot__delete"
              onClick={() => onRemoveService(service.id)}
              aria-label="删除这场跟妆"
            >
              <DeleteOutline fontSize={15} />
            </button>
          ) : null
        }
        onPickDate={() => onPickServiceDate(service.id)}
        onPickStartTime={() => onPickServiceStartTime(service.id)}
        onPickEndTime={() => onPickServiceEndTime(service.id)}
      >
        <div className="appointment-slot__subtypes my-2" aria-label="跟妆类型">
          {bridalSubtypeOptions.map((option) => {
            const active = (service.subtype ?? subtype) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => onChangeServiceSubtype(service.id, option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </AppointmentSlotCard>
    ))}
    <div className="appointment-schedule__service-head">
      <button type="button" onClick={onAddService} aria-label="新增跟妆档期">
        <AddCircleOutline fontSize={16} />
        新增
      </button>
    </div>
  </div>
);

type DailyProps = {
  slot: AppointmentSlot;
  onPickDate: () => void;
  onPickStartTime: () => void;
  onPickEndTime: () => void;
};

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
);

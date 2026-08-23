import { forwardRef, type ReactNode } from 'react'
import {
  BellOutline,
  CalendarOutline,
  ClockCircleOutline,
  EnvironmentOutline,
  HeartOutline,
  ShopbagOutline,
  StarOutline,
  TextOutline,
  UserOutline,
} from 'antd-mobile-icons'
import { formatTimeRange, getTodayKey } from '../../utils/date'
import {
  getScheduleCardServiceLine,
  getScheduleCardSlot,
  getScheduleServiceSlots,
  getScheduleTrialSlots,
  getServiceSubtypeLabel,
} from '../../types/schedule'
import type { Schedule, ServiceSubtype } from '../../types/schedule'
import type { AppointmentCardDraft } from './appointmentCardTypes'

type Props = {
  schedule: Schedule
  draft: AppointmentCardDraft
}

const bgSrc = `${import.meta.env.BASE_URL}appointment-confirmation-bg1.jpg`
const logoSrc = `${import.meta.env.BASE_URL}kang-studio-icon-transparent.png`

const defaultSkincareTips = [
  '睡前一晚敷一片温和保湿面膜，让肌肤保持柔软水润，更好地贴合底妆。',
  '前一晚洗头后无需使用护发素，并将头发吹干。保持蓬松干爽，更方便造型。',
  '尽量避免熬夜，让肌肤维持更好的状态。',
]

const pickText = (...values: Array<string | undefined>) =>
  values.find((value) => value?.trim())?.trim() ?? ''

const formatDotDate = (dateKey: string) =>
  dateKey.replace(/-/g, '.')

const formatSlotLine = (
  entry: { date: string; startTime?: string; subtype?: ServiceSubtype },
  withName: boolean,
) => {
  const parts = [formatDotDate(entry.date), entry.startTime]
  if (withName && entry.subtype && entry.subtype !== 'early_makeup') {
    parts.push(getServiceSubtypeLabel(entry.subtype))
  }
  return parts.filter(Boolean).join(' · ')
}

const getSlotEntryName = (entry: { subtype?: ServiceSubtype }) =>
  entry.subtype && entry.subtype !== 'early_makeup'
    ? getServiceSubtypeLabel(entry.subtype)
    : '婚期'

const InfoRow = ({
  icon,
  label,
  sublabel,
  value,
}: {
  icon: ReactNode
  label: string
  sublabel: string
  value: ReactNode
}) => (
  <div className="appointment-card__info-row">
    <div className="appointment-card__info-icon">{icon}</div>
    <div className="appointment-card__info-meta">
      <span className="appointment-card__info-label">{label}</span>
      <span className="appointment-card__info-sublabel">{sublabel}</span>
    </div>
    <span className="appointment-card__info-divider" />
    <div className="appointment-card__info-value">{value}</div>
  </div>
)

export const AppointmentReminderCard = forwardRef<HTMLDivElement, Props>(
  ({ schedule, draft }, ref) => {
    const todayKey = getTodayKey()
    const upcomingTrialSlot = getScheduleTrialSlots(schedule).find(
      (slot) => slot.date >= todayKey,
    )
    const cardSlot = upcomingTrialSlot ?? getScheduleCardSlot(schedule)
    const appointmentDate = cardSlot?.date ?? schedule.date
    const appointmentTime = cardSlot
      ? formatTimeRange(cardSlot)
      : formatTimeRange(schedule)
    const isTrial = cardSlot?.kind === 'trial'
    const weddingDateEntries: Array<{ date: string; startTime?: string; subtype?: ServiceSubtype }> =
      getScheduleServiceSlots(schedule).map((slot) => ({
        date: slot.date,
        startTime: slot.startTime,
        subtype: slot.subtype,
      }))
    if (
      schedule.date
      && schedule.date !== todayKey
      && !weddingDateEntries.some((entry) => entry.date === schedule.date)
    ) {
      weddingDateEntries.push({
        date: schedule.date,
        startTime: schedule.startTime,
        subtype: schedule.serviceSubtype,
      })
    }
    weddingDateEntries.sort((a, b) => a.date.localeCompare(b.date))
    const shownWeddingEntries = weddingDateEntries.filter(
      (entry) => entry.date !== appointmentDate,
    )
    const weddingNames = Array.from(new Set(shownWeddingEntries.map(getSlotEntryName)))
    const weddingLines = shownWeddingEntries.map((entry) =>
      formatSlotLine(entry, weddingNames.length > 1),
    )
    const customerName = pickText(draft.customerName, schedule.customer, '客户姓名')
    const serviceLine = pickText(draft.serviceLine, getScheduleCardServiceLine(schedule))
    const reminderText =
      '请按预约时间抵达，建议提前 5 分钟到店。\n我们会为您预留完整的妆造时间。'
    const skincareBlocks = [
      {
        title: '充分保湿',
        body: defaultSkincareTips[0],
        icon: <HeartOutline fontSize={24} />,
      },
      {
        title: '头发准备',
        body: defaultSkincareTips[1],
        icon: <StarOutline fontSize={24} />,
      },
      {
        title: '保持睡眠',
        body: defaultSkincareTips[2],
        icon: <ClockCircleOutline fontSize={24} />,
      },
    ]

    return (
      <div className="appointment-card appointment-card--poster" ref={ref}>
        <img className="appointment-card__bg" src={bgSrc} alt="" aria-hidden="true" />

        <div className="appointment-card__overlay">
          <header className="appointment-card__brand">
            <img className="appointment-card__logo" src={logoSrc} alt="KANG STUDIO" />
            <div className="appointment-card__brand-copy">
              <span className="appointment-card__brand-cn">康造型美妆工作室</span>
              <span className="appointment-card__brand-en">KANG STUDIO</span>
            </div>
          </header>

          <section className="appointment-card__hero">
            <h1 className="appointment-card__title">预约确认</h1>
            <p className="appointment-card__subtitle">APPOINTMENT CONFIRMATION</p>
            <p className="appointment-card__tagline">————</p>
          </section>

          <section className="appointment-card__details" aria-label="预约信息">
            <div className="appointment-card__section-head">
              <div className="appointment-card__section-icon">
                <TextOutline fontSize={26} />
              </div>
              <div className="appointment-card__section-copy">
                <span className="appointment-card__section-label">预约信息</span>
                <span className="appointment-card__section-sub">APPOINTMENT DETAILS</span>
              </div>
            </div>
            <div className="appointment-card__panel">
              <InfoRow
                icon={<UserOutline fontSize={24} />}
                label="姓名"
                sublabel="CLIENT"
                value={customerName}
              />
              <InfoRow
                icon={<CalendarOutline fontSize={24} />}
                label={isTrial ? '试妆' : '日期'}
                sublabel={isTrial ? 'TRIAL' : 'DATE & TIME'}
                value={`${formatDotDate(appointmentDate)} · ${appointmentTime.replace(' - ', '–')}`}
              />
              {weddingLines.length > 0 && (
                <InfoRow
                  icon={<HeartOutline fontSize={24} />}
                  label={weddingNames.join(' · ')}
                  sublabel={weddingNames.includes('婚期') ? 'WEDDING DATE' : 'BANQUET DATE'}
                  value={
                    weddingLines.length > 1
                      ? weddingLines.map((line, index) => (
                          <span className="appointment-card__info-value-line" key={`${line}-${index}`}>
                            {line}
                          </span>
                        ))
                      : weddingLines[0]
                  }
                />
              )}
              <InfoRow
                icon={<ShopbagOutline fontSize={24} />}
                label="化妆师"
                sublabel="MAKEUP ARTIST"
                value="康康老师"
              />
              <InfoRow
                icon={<ClockCircleOutline fontSize={24} />}
                label="服务项目"
                sublabel="SERVICE"
                value={serviceLine}
              />
            </div>
          </section>

          <section className="appointment-card__location">
            <div className="appointment-card__section-head">
              <div className="appointment-card__section-icon">
                <EnvironmentOutline fontSize={26} />
              </div>
              <div className="appointment-card__section-copy">
                <span className="appointment-card__section-label">工作室地址</span>
                <span className="appointment-card__section-sub">LOCATION</span>
              </div>
            </div>
            <p className="appointment-card__location-line">
              成都市成华区成华大道杉板桥路266号
              <br />
              龙湖梵城1-1-1119
            </p>
          </section>

          <section className="appointment-card__reminder">
            <div className="appointment-card__reminder-icon">
              <BellOutline fontSize={24} />
            </div>
            <div className="appointment-card__reminder-copy">
              <div className="appointment-card__section-copy">
                <span className="appointment-card__section-label">到店提醒</span>
                <span className="appointment-card__section-sub">ARRIVAL</span>
              </div>
              <p>{reminderText}</p>
            </div>
          </section>

          <section className="appointment-card__skincare">
            <div className="appointment-card__section-head appointment-card__section-head--compact">
              <div className="appointment-card__section-icon">
                <StarOutline fontSize={24} />
              </div>
              <div className="appointment-card__section-copy">
                <span className="appointment-card__section-label">妆前准备</span>
                <span className="appointment-card__section-sub">PREPARATION</span>
              </div>
            </div>
            <p className="appointment-card__skincare-intro">
              让肌肤保持稳定，是底妆好看的第一步。
            </p>
            <div className="appointment-card__tip-grid">
              {skincareBlocks.map((tip) => (
                <div className="appointment-card__tip" key={tip.title}>
                  <div className="appointment-card__tip-icon">{tip.icon}</div>
                  <div className="appointment-card__tip-copy">
                    <strong>{tip.title}</strong>
                    <p>{tip.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="appointment-card__footer">
            <p className="appointment-card__blessing">See you soon.</p>
            <p className="appointment-card__closing">好的状态，留给重要的时刻。</p>
          </footer>
        </div>
      </div>
    )
  },
)

AppointmentReminderCard.displayName = 'AppointmentReminderCard'

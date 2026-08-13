import { useMemo } from 'react'
import { Button, Empty } from 'antd-mobile'
import { EnvironmentOutline, RightOutline, TagOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { getCustomerName, formatCompactDate, formatDaysUntil, formatWeekday, getDaysUntil } from '../../app/bridalData'
import { useScheduleStore } from '../../app/useScheduleStore'
import { getBrideStageShortLabel, getScheduleBrideStage } from '../../types/schedule'
import type { Schedule } from '../../types/schedule'
import { getTodayKey } from '../../utils/date'

type MonthGroup = {
  key: string
  label: string
  schedules: Schedule[]
}

const groupByMonth = (schedules: Schedule[]): MonthGroup[] => {
  const map = new Map<string, MonthGroup>()

  for (const schedule of schedules) {
    const date = new Date(`${schedule.date}T00:00:00`)
    const key = schedule.date.slice(0, 7)
    const group = map.get(key) ?? {
      key,
      label: `${date.getFullYear()}年 ${date.getMonth() + 1}月`,
      schedules: [],
    }
    group.schedules.push(schedule)
    map.set(key, group)
  }

  return Array.from(map.values())
}

const ScheduleRow = ({ schedule }: { schedule: Schedule }) => {
  const navigate = useNavigate()
  const name = getCustomerName(schedule)
  const days = getDaysUntil(schedule.date)

  return (
    <button
      type="button"
      className="tap-card bridal-scroll-card grid min-h-20.5 w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-5.5 border border-(--app-border) bg-white px-3 py-3 text-left shadow-(--app-shadow)"
      onClick={() => navigate(`/customer/${schedule.id}`)}
    >
      <div className="grid h-14.5 w-14.5 place-items-center rounded-2xl bg-(--app-surface-soft)">
        <strong className="text-[24px] font-normal leading-none text-(--app-text)">{formatCompactDate(schedule.date).split('月')[1].replace('日', '')}</strong>
        <span className="text-[11px] text-(--app-muted)">{formatWeekday(schedule.date)}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <strong className="truncate text-[16px] font-bold text-(--app-text)">{name}</strong>
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-(--app-primary) px-2 text-[11px] font-semibold text-white">
            <TagOutline fontSize={12} />
            {getBrideStageShortLabel(getScheduleBrideStage(schedule))}
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] text-(--app-muted)">
          <EnvironmentOutline className="mr-1 inline align-[-2px]" />
          {schedule.location ?? '地点待确认'}
        </p>
      </div>
      <div className="flex items-center gap-1 text-right text-[13px] text-(--app-muted)">
        <span className={days <= 7 && days >= 0 ? 'font-semibold text-(--app-primary)' : ''}>{formatDaysUntil(schedule.date)}</span>
        <RightOutline className="text-(--app-soft-muted)" />
      </div>
    </button>
  )
}

export const HomePage = () => {
  const navigate = useNavigate()
  const { schedules } = useScheduleStore()
  const todayKey = getTodayKey()
  const upcomingSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.status !== 'cancelled' && schedule.date >= todayKey),
    [schedules, todayKey],
  )
  const featured = upcomingSchedules[0]
  const monthGroups = useMemo(() => groupByMonth(upcomingSchedules), [upcomingSchedules])

  return (
    <div className="space-y-5">
      <section className="pt-1">
        <p className="text-[13px] font-medium text-(--app-primary)">妆期</p>
        <h1 className="mt-1 text-[30px] font-bold leading-tight text-(--app-text)">日程安排</h1>
        <p className="mt-1 text-[15px] text-(--app-muted)">按时间顺序，一眼看清每一场</p>
      </section>

      {featured ? (
        <button
          type="button"
          className="tap-card block w-full rounded-6.5 bg-(--app-primary) px-5 py-5 text-left text-white shadow-[0_16px_34px_rgba(169,63,95,0.28)]"
          onClick={() => navigate(`/customer/${featured.id}`)}
        >
          <div className="text-[13px] opacity-85">最近一场</div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[27px] font-bold leading-none">{getCustomerName(featured)}</h2>
              <p className="mt-3 flex items-center gap-2 text-[13px] opacity-90">
                <TagOutline fontSize={14} />
                {getBrideStageShortLabel(getScheduleBrideStage(featured))}
                <span>{formatCompactDate(featured.date)}</span>
                <span>{formatWeekday(featured.date)}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <strong className="block text-[34px] font-light leading-none">{Math.max(getDaysUntil(featured.date), 0)}</strong>
              <span className="text-[13px] opacity-85">天后</span>
            </div>
          </div>
          <div className="my-4 h-px bg-white/18" />
          <p className="truncate text-[14px] opacity-90">
            <EnvironmentOutline className="mr-1 inline align-[-2px]" />
            {featured.location ?? '地点待确认'}
          </p>
        </button>
      ) : (
        <div className="rounded-3xl border border-(--app-border) bg-white py-8 shadow-(--app-shadow)">
          <Empty description="还没有未来档期" />
          <div className="px-5 pt-4">
            <Button block color="primary" onClick={() => navigate('/schedule/new')}>
              新建客户
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {monthGroups.map((group) => (
          <section key={group.key} className="space-y-3">
            <h2 className="px-1 text-[14px] font-bold text-(--app-muted)">{group.label}</h2>
            <div className="space-y-3">
              {group.schedules.map((schedule) => (
                <ScheduleRow key={schedule.id} schedule={schedule} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

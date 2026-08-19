import { forwardRef, useMemo } from "react";
import type { Schedule } from "../../types/schedule";
import { getScheduleServiceSlots, getScheduleTrialSlots } from "../../types/schedule";
import { getMonthDays, isSameMonth, toDateKey } from "../../utils/date";

type Props = {
  month: Date;
  schedules: Schedule[];
  scheduleCount: number;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const CalendarShareCard = forwardRef<HTMLDivElement, Props>(
  ({ month, schedules, scheduleCount }, ref) => {
    const watermarkSrc = `${import.meta.env.BASE_URL}kang-studio-watermark.png`;
    const qrcodeSrc = `${import.meta.env.BASE_URL}kang-studio-qrcode.png`;
    const monthDays = useMemo(() => getMonthDays(month), [month]);
    const todayKey = toDateKey(new Date());

    const updatedLabel = useMemo(() => {
      const now = new Date();
      return `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())} 更新`;
    }, []);

    const countsByDate = useMemo(() => {
      const map = new Map<string, number>();
      for (const schedule of schedules) {
        if (schedule.status === "cancelled") continue;
        for (const slot of getScheduleServiceSlots(schedule)) {
          map.set(slot.date, (map.get(slot.date) ?? 0) + 1);
        }
        for (const slot of getScheduleTrialSlots(schedule)) {
          map.set(slot.date, (map.get(slot.date) ?? 0) + 1);
        }
      }
      return map;
    }, [schedules]);

    const bookedDaysCount = useMemo(
      () =>
        monthDays.filter((day) => {
          if (!isSameMonth(day, month)) return false;
          return (countsByDate.get(toDateKey(day)) ?? 0) > 0;
        }).length,
      [countsByDate, month, monthDays]
    );

    return (
      <div className="calendar-share-card" ref={ref}>
        <div className="calendar-share-card__frame" aria-hidden="true" />
        <div className="calendar-share-card__content">
          <header className="calendar-share-card__brand">
            <img
              className="calendar-share-card__brand-logo"
              src={watermarkSrc}
              alt="KANG STUDIO"
            />
            <span className="calendar-share-card__brand-tag">婚礼跟妆 · 档期日历</span>
          </header>

          <div className="calendar-share-card__head">
            <h2 className="calendar-share-card__title">
              <span className="calendar-share-card__title-month">
                {month.getMonth() + 1}月
              </span>
              <span className="calendar-share-card__title-year">
                {month.getFullYear()}
              </span>
            </h2>
            <div
              className="calendar-share-card__summary"
              aria-label={`已约 ${scheduleCount} 场，共 ${bookedDaysCount} 天`}
            >
              <div className="calendar-share-card__stat">
                <b>{scheduleCount}</b>
                <span>已约场次</span>
              </div>
              <i aria-hidden="true" />
              <div className="calendar-share-card__stat">
                <b>{bookedDaysCount}</b>
                <span>已约天数</span>
              </div>
            </div>
          </div>

          <div className="calendar-share-card__weekdays" aria-hidden="true">
            {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-share-card__grid">
            {monthDays.map((day) => {
              const dateKey = toDateKey(day);
              const count = countsByDate.get(dateKey) ?? 0;
              const currentMonth = isSameMonth(day, month);
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className={`calendar-share-card__cell${
                    currentMonth ? "" : " is-muted"
                  }${count > 0 ? " has-booking" : ""}${isToday ? " is-today" : ""}`}
                >
                  <span className="calendar-share-card__cell-day">
                    {day.getDate()}
                  </span>
                  {count > 1 ? (
                    <span className="calendar-share-card__cell-count">{count}</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <footer className="calendar-share-card__foot">
            <div className="calendar-share-card__foot-info">
              <span className="calendar-share-card__foot-brand">KANG STUDIO</span>
              <span className="calendar-share-card__foot-note">{updatedLabel}</span>
              <div className="calendar-share-card__legend" aria-hidden="true">
                <span>
                  <i className="is-booked" />
                  已约
                </span>
                <span>
                  <i className="is-free" />
                  空档
                </span>
                <span>
                  <i className="is-today" />
                  今日
                </span>
              </div>
            </div>
            <div className="calendar-share-card__qr">
              <span className="calendar-share-card__qr-box">
                <img src={qrcodeSrc} alt="微信二维码，扫码预约档期" />
              </span>
              <span className="calendar-share-card__qr-caption">扫码预约档期</span>
            </div>
          </footer>
        </div>
      </div>
    );
  }
);

CalendarShareCard.displayName = "CalendarShareCard";

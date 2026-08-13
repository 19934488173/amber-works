import { forwardRef, useMemo } from "react";
import type { Schedule } from "../../types/schedule";
import {
  formatYearMonth,
  getMonthDays,
  isSameMonth,
  toDateKey,
} from "../../utils/date";

type Props = {
  month: Date;
  schedules: Schedule[];
  scheduleCount: number;
};

export const CalendarShareCard = forwardRef<HTMLDivElement, Props>(
  ({ month, schedules, scheduleCount }, ref) => {
    const monthDays = useMemo(() => getMonthDays(month), [month]);
    const todayKey = toDateKey(new Date());

    const countsByDate = useMemo(() => {
      const map = new Map<string, number>();
      for (const schedule of schedules) {
        if (schedule.status === "cancelled") continue;
        map.set(schedule.date, (map.get(schedule.date) ?? 0) + 1);
      }
      return map;
    }, [schedules]);

    return (
      <div className="calendar-share-card" ref={ref}>
        <div className="calendar-share-card__watermark" aria-hidden="true">
          <span className="calendar-share-card__watermark-mark">康</span>
          <span className="calendar-share-card__watermark-name">
            KANG STUDIO
          </span>
        </div>

        <div className="calendar-share-card__content">
          <header className="calendar-share-card__head">
            <p className="calendar-share-card__eyebrow">档期概览</p>
            <h2 className="calendar-share-card__title">
              {formatYearMonth(month)}
            </h2>
            <p className="calendar-share-card__meta">共 {scheduleCount} 档</p>
          </header>

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
                  }${count > 0 ? " has-booking" : ""}${
                    isToday ? " is-today" : ""
                  }`}
                >
                  <span className="calendar-share-card__cell-day">
                    {day.getDate()}
                  </span>
                  <span
                    className={`calendar-share-card__cell-dot${
                      count > 0 ? " is-visible" : ""
                    }${count > 1 ? " is-count" : ""}`}
                  >
                    {count > 1 ? count : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="calendar-share-card__legend" aria-hidden="true">
            <span>
              <i className="is-booked" />
              有档期
            </span>
            <span>
              <i className="is-free" />
              空档
            </span>
          </div>
        </div>
      </div>
    );
  }
);

CalendarShareCard.displayName = "CalendarShareCard";

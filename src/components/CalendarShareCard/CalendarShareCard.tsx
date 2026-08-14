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
    const watermarkSrc = `${import.meta.env.BASE_URL}kang-studio-watermark.png`;
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
        <div className="calendar-share-card__content">
          <header className="calendar-share-card__head">
            <div>
              <p className="calendar-share-card__eyebrow">本月档期</p>
              <h2 className="calendar-share-card__title">
                {formatYearMonth(month)}
              </h2>
            </div>
            <div
              className="calendar-share-card__summary"
              aria-label={`已约 ${scheduleCount} 场，共 ${bookedDaysCount} 天`}
            >
              <span>已约</span>
              <b>{scheduleCount}</b>
              <small>场</small>
              <i aria-hidden="true" />
              <b>{bookedDaysCount}</b>
              <small>天</small>
            </div>
          </header>

          <div className="calendar-share-card__weekdays" aria-hidden="true">
            {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-share-card__dates">
            <img
              className="calendar-share-card__dates-watermark"
              src={watermarkSrc}
              alt=""
              aria-hidden="true"
            />
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
                    {count > 0 ? (
                      <span
                        className="calendar-share-card__lipstick"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 1024 1024"
                          xmlns="http://www.w3.org/2000/svg"
                          focusable="false"
                        >
                          <path
                            d="M689.9 949.4c0 0.5-0.4 1-1 1H333.4c-0.5 0-1-0.5-1-1V646.9c0-0.5 0.5-1 1-1h355.5c0.6 0 1 0.5 1 1v302.5z"
                            fill="#FFFFFF"
                          />
                          <path
                            d="M688.9 951.4H333.4c-1.1 0-2-0.9-2-2V646.9c0-1.1 0.9-2 2-2h355.5c1.1 0 2 0.9 2 2v302.5c0 1.1-0.9 2-2 2zM333.4 646.9v302.5h355.5V646.9H333.4z"
                            fill="#a24361"
                          />
                          <path
                            d="M649.2 644.9c0 0.6-0.5 1-1 1H374.1c-0.6 0-1-0.4-1-1V362.2c0-0.6 0.4-1 1-1h274.1c0.5 0 1 0.4 1 1v282.7z"
                            fill="#FFFFFF"
                          />
                          <path
                            d="M552.6 644.9c0 0.6-0.5 1-1 1H364.2c-0.6 0-1-0.4-1-1V362.2c0-0.6 0.4-1 1-1h187.4c0.5 0 1 0.4 1 1v282.7z"
                            fill="#e5a0b1"
                          />
                          <path
                            d="M337.4 655.8h256.3v284.7H337.4z"
                            fill="#b54768"
                          />
                          <path
                            d="M688.9 960.4H333.4c-6.1 0-11-4.9-11-11V646.9c0-6.1 4.9-11 11-11h355.5c6.1 0 11 4.9 11 11v302.5c0 6.1-5 11-11 11z m-346.5-20h337.5V655.9H342.4v284.5z"
                            fill="#a24361"
                          />
                          <path
                            d="M428.6 343.2V221.8c0-3.5 0.5-7 1.9-10 5.7-12.7 27.6-43.9 109.5-111.3 0 0 15.4-12.2 30.1-21.7 10.7-6.9 23.7 2.5 23.7 17.1v253.8c0 11-7.6 10-16.7 9.5l-133 0.5c-8.7-0.5-15.5-6.2-15.5-16.5z"
                            fill="#b54768"
                          />
                          <path
                            d="M443.8 369.6h-0.3c-14.7-0.7-25-11.6-25-26.5V221.7c0-5.3 0.9-10 2.8-14.2 7.3-16.3 32.8-49.5 112.2-114.9l0.2-0.1c0.6-0.5 16-12.6 30.9-22.2 7.5-4.8 16.6-5.2 24.4-1 9.1 4.9 14.7 15.1 14.7 26.4v253.8c0 6.3-1.9 11.3-5.5 14.8-5.8 5.5-13.5 5.1-20.3 4.8l-1.1-0.1-133 0.6z m102.4-261.4c-83.5 68.7-102.4 98.2-106.6 107.6-0.7 1.5-1 3.6-1 5.9v121.4c0 2.6 0.6 6.1 5.7 6.5l132.9-0.5 1.7 0.1c1.5 0.1 3.4 0.2 4.8 0.2V95.8c0-4.8-2.3-7.8-4.3-8.9-1.4-0.7-2.6-0.7-4 0.2-13.5 8.8-28 20.2-29.2 21.1z"
                            fill="#a24361"
                          />
                          <path
                            d="M648.2 655.9H374.1c-6.1 0-11-4.9-11-11V362.2c0-6.1 4.9-11 11-11h274.1c6.1 0 11 4.9 11 11v282.7c0 6.1-4.9 11-11 11z m-265.1-20h256.1V371.2H383.1v264.7z"
                            fill="#a24361"
                          />
                        </svg>
                      </span>
                    ) : null}
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

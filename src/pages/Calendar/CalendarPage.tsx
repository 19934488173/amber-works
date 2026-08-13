import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Empty, Picker, Toast } from "antd-mobile";
import { LeftOutline, PictureOutline, RightOutline } from "antd-mobile-icons";
import { useScheduleStore } from "../../app/useScheduleStore";
import { CalendarShareCard } from "../../components/CalendarShareCard/CalendarShareCard";
import { ScheduleList } from "../../components/ScheduleList/ScheduleList";
import {
  addMonths,
  formatDateWithWeekday,
  formatYearMonth,
  getMonthDays,
  isSameMonth,
  setYearMonth,
  toDateKey,
} from "../../utils/date";
import { hasConflict } from "../../utils/conflict";
import {
  formatCurrency,
  getMonthStats,
  getPaymentEvents,
  getRemainingAmount,
} from "../../utils/statistics";
import { createShareImage, getMonthShareFileName } from "../../utils/share";
import type { Schedule } from "../../types/schedule";

const currentYear = new Date().getFullYear();

const yearMonthColumns = [
  Array.from({ length: 21 }, (_, index) => {
    const year = currentYear - 10 + index;
    return { label: `${year}年`, value: year };
  }),
  Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1}月`,
    value: index,
  })),
];

const formatCompactIncome = (amount: number) => {
  if (amount >= 10000)
    return `¥${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万`;
  if (amount >= 1000)
    return `¥${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return `¥${amount}`;
};

type DaySummary = {
  schedules: Schedule[];
  paidAmount: number;
  payments: ReturnType<typeof getPaymentEvents>;
};

const emptyDaySummary = (): DaySummary => ({
  schedules: [],
  paidAmount: 0,
  payments: [],
});

export const CalendarPage = () => {
  const { schedules, updateStatus, removeSchedule, duplicateSchedule } =
    useScheduleStore();
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const selectedDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);
  const monthDays = useMemo(
    () => getMonthDays(selectedDateObj),
    [selectedDateObj]
  );
  const summariesByDate = useMemo(() => {
    const map = new Map<string, DaySummary>();

    for (const schedule of schedules) {
      const summary = map.get(schedule.date) ?? emptyDaySummary();
      summary.schedules.push(schedule);
      map.set(schedule.date, summary);

      if (schedule.status === "cancelled") continue;
      for (const event of getPaymentEvents(schedule)) {
        const paymentSummary = map.get(event.date) ?? emptyDaySummary();
        paymentSummary.payments.push(event);
        paymentSummary.paidAmount += event.amount;
        map.set(event.date, paymentSummary);
      }
    }

    return map;
  }, [schedules]);
  const selectedSummary =
    summariesByDate.get(selectedDate) ?? emptyDaySummary();
  const selectedSchedules = selectedSummary.schedules;
  const selectedPaidAmount = selectedSummary.paidAmount;
  const selectedPayments = selectedSummary.payments;
  const monthStats = useMemo(
    () => getMonthStats(schedules, selectedDateObj),
    [schedules, selectedDateObj]
  );
  const conflictCount = selectedSchedules.filter((schedule) =>
    hasConflict(schedule, schedules, schedule.id)
  ).length;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayKey(toDateKey(new Date()));
    }, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const goPrevious = () =>
    setSelectedDate(toDateKey(addMonths(selectedDateObj, -1)));
  const goNext = () =>
    setSelectedDate(toDateKey(addMonths(selectedDateObj, 1)));

  const shareMonth = async () => {
    if (!shareRef.current) return;
    await createShareImage(
      shareRef.current,
      getMonthShareFileName(monthStats.monthKey)
    );
    Toast.show("已生成分享图片");
  };

  const confirmRemove = (schedule: Schedule) => {
    void Dialog.confirm({
      content: `删除「${schedule.customer || schedule.title}」？此操作不可恢复。`,
      confirmText: "删除",
      onConfirm: async () => {
        await removeSchedule(schedule.id);
        Toast.show("已删除");
      },
    });
  };

  return (
    <div className="calendar-page">
      <div className="share-capture-host" aria-hidden="true">
        <CalendarShareCard
          ref={shareRef}
          month={selectedDateObj}
          schedules={schedules}
          scheduleCount={monthStats.scheduleCount}
        />
      </div>
      <section className="calendar-page__hero">
        <div className="calendar-page__hero-row">
          <h1 className="calendar-page__title">
            {formatYearMonth(selectedDateObj)}
          </h1>
          <div className="calendar-page__hero-actions">
            <button
              type="button"
              className="calendar-page__share-btn"
              onClick={() => {
                void shareMonth();
              }}
            >
              <PictureOutline fontSize={14} />
              分享档期
            </button>
            <button
              type="button"
              className="calendar-page__today-btn"
              onClick={() => setSelectedDate(todayKey)}
            >
              回到今天
            </button>
          </div>
        </div>
        <div className="calendar-page__stats">
          <div className="calendar-page__stat">
            <span>档期</span>
            <strong>{monthStats.scheduleCount}</strong>
          </div>
          <div className="calendar-page__stat is-income">
            <span>实收</span>
            <strong>{formatCurrency(monthStats.paidAmount)}</strong>
          </div>
          <div className="calendar-page__stat is-balance">
            <span>尾款</span>
            <strong>{formatCurrency(monthStats.remainingAmount)}</strong>
          </div>
        </div>
      </section>

      <section className="calendar-page__card">
        <div className="calendar-page__nav">
          <button
            type="button"
            className="calendar-page__nav-btn"
            aria-label="上个月"
            onClick={goPrevious}
          >
            <LeftOutline fontSize={18} />
          </button>
          <button
            type="button"
            className="calendar-page__nav-title"
            onClick={() => setYearMonthPickerVisible(true)}
          >
            <strong>{formatYearMonth(selectedDateObj)}</strong>
            <span>切换月份</span>
          </button>
          <button
            type="button"
            className="calendar-page__nav-btn"
            aria-label="下个月"
            onClick={goNext}
          >
            <RightOutline fontSize={18} />
          </button>
        </div>

        <div className="calendar-page__weekdays" aria-hidden="true">
          {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calendar-page__grid">
          {monthDays.map((day) => {
            const dateKey = toDateKey(day);
            const summary = summariesByDate.get(dateKey) ?? emptyDaySummary();
            const daySchedules = summary.schedules.filter(
              (schedule) => schedule.status !== "cancelled"
            );
            const count = daySchedules.length;
            const balanceCount = daySchedules.filter(
              (schedule) => getRemainingAmount(schedule) > 0
            ).length;
            const paidAmount = summary.paidAmount;
            const currentMonth = isSameMonth(day, selectedDateObj);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;

            return (
              <button
                key={dateKey}
                type="button"
                className={`calendar-page__cell${
                  isSelected ? " is-active" : ""
                }${isToday ? " is-today" : ""}${
                  currentMonth ? "" : " is-muted"
                }${count > 0 ? " has-booking" : ""}${
                  balanceCount > 0 ? " has-balance" : ""
                }`}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span className="calendar-page__cell-day">{day.getDate()}</span>
                {paidAmount > 0 ? (
                  <small className="calendar-page__cell-income">
                    {formatCompactIncome(paidAmount)}
                  </small>
                ) : count > 0 ? (
                  <small className="calendar-page__cell-note">待收</small>
                ) : (
                  <small className="calendar-page__cell-note is-empty" />
                )}
                <span
                  className={`calendar-page__cell-dot${
                    count > 0 ? " is-visible" : ""
                  }${count > 1 ? " is-count" : ""}`}
                >
                  {count > 1 ? count : ""}
                </span>
                {balanceCount > 0 && (
                  <em className="calendar-page__cell-badge">尾</em>
                )}
              </button>
            );
          })}
        </div>

        <div className="calendar-page__legend" aria-label="档期状态说明">
          <span>
            <i className="is-booked" />
            有档期
          </span>
          <span>
            <i className="is-free" />
            空档
          </span>
          <span>
            <i className="is-balance" />
            待收尾款
          </span>
        </div>
      </section>

      <section className="calendar-page__day">
        <div className="calendar-page__day-head">
          <div>
            <span className="calendar-page__eyebrow">当天安排</span>
            <h2 className="calendar-page__day-title">
              {formatDateWithWeekday(selectedDate)}
            </h2>
          </div>
          <div className="calendar-page__day-count">
            <strong>{selectedSchedules.filter((schedule) => schedule.status !== "cancelled").length}</strong>
            <span>档</span>
          </div>
        </div>

        {(selectedPaidAmount > 0 || conflictCount > 0) && (
          <div className="calendar-page__day-metrics">
            {selectedPaidAmount > 0 && (
              <div className="calendar-page__day-metric is-income">
                <span>实收</span>
                <strong>{formatCurrency(selectedPaidAmount)}</strong>
              </div>
            )}
            {conflictCount > 0 && (
              <div className="calendar-page__day-metric is-warning">
                <span>时间冲突</span>
                <strong>{conflictCount} 个</strong>
              </div>
            )}
          </div>
        )}

        {selectedPayments.length > 0 && (
          <div className="calendar-page__payments">
            {selectedPayments.map((event) => (
              <div
                className="calendar-page__payment"
                key={`${event.schedule.id}-${event.type}-${event.date}`}
              >
                <div>
                  <strong>
                    {event.schedule.customer || event.schedule.title}
                  </strong>
                  <small>{event.label}</small>
                </div>
                <b>+{formatCurrency(event.amount)}</b>
              </div>
            ))}
          </div>
        )}

        <div className="calendar-page__day-body">
          {selectedSchedules.length === 0 ? (
            <Empty description="这一天没有档期" />
          ) : (
            <ScheduleList
              schedules={selectedSchedules}
              onComplete={(schedule) => updateStatus(schedule.id, "completed")}
              onDelete={confirmRemove}
              onDuplicate={(schedule) =>
                duplicateSchedule(schedule, selectedDate)
              }
            />
          )}
        </div>
      </section>

      <Picker
        visible={yearMonthPickerVisible}
        columns={yearMonthColumns}
        title="选择年月"
        value={[selectedDateObj.getFullYear(), selectedDateObj.getMonth()]}
        onClose={() => setYearMonthPickerVisible(false)}
        onConfirm={(value) => {
          const year = Number(value[0]);
          const monthIndex = Number(value[1]);
          setSelectedDate(
            toDateKey(setYearMonth(selectedDateObj, year, monthIndex))
          );
          setYearMonthPickerVisible(false);
        }}
      />
    </div>
  );
};

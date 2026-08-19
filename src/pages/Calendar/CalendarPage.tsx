import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Empty, Picker, Toast } from "antd-mobile";
import { LeftOutline, PictureOutline, RightOutline } from "antd-mobile-icons";
import { useSearchParams } from "react-router-dom";
import { useScheduleStore } from "../../app/useScheduleStore";
import { CalendarShareCard } from "../../components/CalendarShareCard/CalendarShareCard";
import { ScheduleList } from "../../components/ScheduleList/ScheduleList";
import {
  addMonths,
  formatDateWithWeekday,
  formatYearMonth,
  getDateKeyValue,
  getMonthDays,
  isSameMonth,
  setYearMonth,
  toDateKey,
} from "../../utils/date";
import {
  formatCurrency,
  getMonthStats,
  getPaymentEvents,
  getRemainingAmount,
} from "../../utils/statistics";
import { createShareImage, getMonthShareFileName } from "../../utils/share";
import { ShareImagePreview } from "../../components/ShareImagePreview/ShareImagePreview";
import type { Schedule } from "../../types/schedule";
import {
  getScheduleServiceSlots,
  getScheduleTrialSlots,
  isDailyMakeup,
} from "../../types/schedule";

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
  trialSchedules: Schedule[];
  paidAmount: number;
  payments: ReturnType<typeof getPaymentEvents>;
};

const emptyDaySummary = (): DaySummary => ({
  schedules: [],
  trialSchedules: [],
  paidAmount: 0,
  payments: [],
});

const uniqueSchedules = (schedules: Schedule[]) =>
  Array.from(new Map(schedules.map((schedule) => [schedule.id, schedule])).values());

export const CalendarPage = () => {
  const { schedules, removeSchedule } = useScheduleStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() =>
    getDateKeyValue(searchParams.get("date")) ?? todayKey
  );
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);
  const [sharePreview, setSharePreview] = useState<{
    dataUrl: string;
    fileName: string;
  } | null>(null);
  const [isSharingMonth, setIsSharingMonth] = useState(false);
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
      for (const slot of getScheduleServiceSlots(schedule)) {
        const summary = map.get(slot.date) ?? emptyDaySummary();
        summary.schedules.push(schedule);
        map.set(slot.date, summary);
      }

      for (const slot of getScheduleTrialSlots(schedule)) {
        const trialSummary = map.get(slot.date) ?? emptyDaySummary();
        trialSummary.trialSchedules.push(schedule);
        map.set(slot.date, trialSummary);
      }

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
  const selectedDaySchedules = uniqueSchedules([
    ...selectedSummary.trialSchedules,
    ...selectedSummary.schedules,
  ]);
  const selectedActiveSchedules = selectedDaySchedules.filter(
    (schedule) => schedule.status !== "cancelled"
  );
  const selectedTrialSchedules = selectedSummary.trialSchedules.filter(
    (schedule) => schedule.status !== "cancelled"
  );
  const selectedFollowSchedules = selectedSummary.schedules.filter(
    (schedule) => schedule.status !== "cancelled"
  );
  const selectedOccupancyCount =
    selectedTrialSchedules.length + selectedFollowSchedules.length;
  const selectedConflictCount = Math.max(selectedOccupancyCount - 1, 0);
  const selectedPaidAmount = selectedSummary.paidAmount;
  const selectedPayments = selectedSummary.payments;
  const monthStats = useMemo(
    () => getMonthStats(schedules, selectedDateObj),
    [schedules, selectedDateObj]
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayKey(toDateKey(new Date()));
    }, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const dateFromSearch = getDateKeyValue(searchParams.get("date"));
    if (dateFromSearch && dateFromSearch !== selectedDate) {
      setSelectedDate(dateFromSearch);
    }
  }, [searchParams, selectedDate]);

  const selectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSearchParams({ date: dateKey }, { replace: true });
  };

  const goPrevious = () =>
    selectDate(toDateKey(addMonths(selectedDateObj, -1)));
  const goNext = () =>
    selectDate(toDateKey(addMonths(selectedDateObj, 1)));

  const shareMonth = async () => {
    if (!shareRef.current || isSharingMonth) return;

    setIsSharingMonth(true);
    try {
      const outcome = await createShareImage(
        shareRef.current,
        getMonthShareFileName(monthStats.monthKey),
      );

      if (outcome.type === "preview") {
        setSharePreview({
          dataUrl: outcome.dataUrl,
          fileName: outcome.fileName,
        });
        return;
      }

      if (outcome.type === "shared") {
        Toast.show("已通过系统分享保存");
        return;
      }

      Toast.show("已保存分享图片");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      Toast.show("生成分享图片失败，请重试");
    } finally {
      setIsSharingMonth(false);
    }
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
      <ShareImagePreview
        visible={sharePreview !== null}
        dataUrl={sharePreview?.dataUrl ?? ""}
        fileName={sharePreview?.fileName ?? ""}
        onClose={() => setSharePreview(null)}
      />
      <section className="calendar-page__hero">
        <div className="calendar-page__hero-row">
          <h1 className="calendar-page__title">
            {formatYearMonth(selectedDateObj)}
          </h1>
          <div className="calendar-page__hero-actions">
            <button
              type="button"
              className="calendar-page__share-btn"
              disabled={isSharingMonth}
              onClick={() => {
                void shareMonth();
              }}
            >
              <PictureOutline fontSize={14} />
              {isSharingMonth ? "生成中" : "分享档期"}
            </button>
            <button
              type="button"
              className="calendar-page__today-btn"
              onClick={() => selectDate(todayKey)}
            >
              回到今天
            </button>
          </div>
        </div>
        <div className="calendar-page__stats" aria-label="本月档期概览">
          <span className="calendar-page__stat">
            <em>已占用</em>
            <strong>{monthStats.occupiedDays}天</strong>
          </span>
          <span className="calendar-page__stat is-available">
            <em>可预约</em>
            <strong>{monthStats.availableDays}天</strong>
          </span>
          <span className="calendar-page__stats-breakdown">
            <span className="calendar-page__stat is-mini is-trial">试妆 {monthStats.trialDays}天</span>
            <span className="calendar-page__stat is-mini is-follow">跟妆 {monthStats.followDays}天</span>
            <span className={`calendar-page__stat is-mini is-conflict${monthStats.conflictDays > 0 ? " is-warning" : ""}`}>
              冲突 {monthStats.conflictDays}天
            </span>
          </span>
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
            const trialSchedules = summary.trialSchedules.filter(
              (schedule) => schedule.status !== "cancelled"
            );
            const followSchedules = summary.schedules.filter(
              (schedule) => schedule.status !== "cancelled"
            );
            const daySchedules = uniqueSchedules([
              ...trialSchedules,
              ...followSchedules,
            ]);
            const count = daySchedules.length;
            const trialCount = trialSchedules.length;
            const followCount = followSchedules.length;
            const dailyCount = followSchedules.filter((s) => isDailyMakeup(s)).length;
            const bridalFollowCount = followCount - dailyCount;
            const occupancyCount = trialCount + followCount;
            const hasDayConflict = occupancyCount > 1;
            const balanceCount = followSchedules.filter(
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
                }${trialCount > 0 ? " has-trial" : ""}${
                  followCount > 0 ? " has-follow" : ""
                }${hasDayConflict ? " has-conflict" : ""}`}
                aria-label={`${dateKey}${
                  trialCount > 0 ? `，试妆${trialCount}个` : ""
                }${bridalFollowCount > 0 ? `，跟妆${bridalFollowCount}个` : ""}${
                  dailyCount > 0 ? `，生活妆${dailyCount}个` : ""
                }${hasDayConflict ? "，档期冲突" : ""}`}
                onClick={() => selectDate(dateKey)}
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
                <span className="calendar-page__cell-slots">
                  {trialCount > 0 && (
                    <b className="is-trial">
                      试{trialCount > 1 ? trialCount : ""}
                    </b>
                  )}
                  {bridalFollowCount > 0 && (
                    <b className="is-follow">
                      跟{bridalFollowCount > 1 ? bridalFollowCount : ""}
                    </b>
                  )}
                  {dailyCount > 0 && (
                    <b className="is-daily">
                      生{dailyCount > 1 ? dailyCount : ""}
                    </b>
                  )}
                </span>
                {(hasDayConflict || balanceCount > 0) && (
                  <em
                    className={`calendar-page__cell-badge${
                      hasDayConflict ? " is-conflict" : ""
                    }`}
                  >
                    {hasDayConflict ? "冲" : "尾"}
                  </em>
                )}
              </button>
            );
          })}
        </div>

        <div className="calendar-page__legend" aria-label="档期状态说明">
          <span>
            <i className="is-trial" />
            试妆
          </span>
          <span>
            <i className="is-follow" />
            跟妆
          </span>
          <span>
            <i className="is-daily" />
            生活妆
          </span>
          <span>
            <i className="is-balance" />
            待收尾款
          </span>
          <span>
            <i className="is-conflict" />
            档期冲突
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
            <strong>{selectedActiveSchedules.length}</strong>
            <span>档</span>
          </div>
        </div>

        {(selectedPaidAmount > 0 || selectedConflictCount > 0) && (
          <div className="calendar-page__day-metrics">
            {selectedPaidAmount > 0 && (
              <div className="calendar-page__day-metric is-income">
                <span>实收</span>
                <strong>{formatCurrency(selectedPaidAmount)}</strong>
              </div>
            )}
            {selectedConflictCount > 0 && (
              <div className="calendar-page__day-metric is-warning">
                <span>档期冲突</span>
                <strong>{selectedOccupancyCount} 个占用</strong>
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
          {selectedDaySchedules.length === 0 ? (
            <Empty description="这一天没有档期" />
          ) : (
            <ScheduleList
              schedules={selectedDaySchedules}
              onDelete={confirmRemove}
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
          selectDate(toDateKey(setYearMonth(selectedDateObj, year, monthIndex)));
          setYearMonthPickerVisible(false);
        }}
      />
    </div>
  );
};

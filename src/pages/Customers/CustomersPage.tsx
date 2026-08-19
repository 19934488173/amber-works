import { useMemo, useState } from "react";
import { Button, Empty, Picker } from "antd-mobile";
import {
  CalendarOutline,
  LeftOutline,
  RightOutline,
} from "antd-mobile-icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  formatCompactDate,
  getCustomerName,
  getInitial,
  normalizeStage,
  stageDisplay,
  stageFlow,
} from "../../app/bridalData";
import { useScheduleStore } from "../../app/useScheduleStore";
import type {
  BrideStage,
  Schedule,
} from "../../types/schedule";
import {
  getScheduleBrideStage,
  getSchedulePrimaryServiceSlot,
  getScheduleServiceSlots,
  getScheduleSlotDates,
  getScheduleTrialSlots,
  isDailyMakeup,
} from "../../types/schedule";
import { DAY_MS, getTodayKey, parseDateKey, sortSchedules } from "../../utils/date";
import {
  formatCurrency,
  getPaidAmount,
  getPaymentEvents,
  getRemainingAmount,
} from "../../utils/statistics";

const currentYear = new Date().getFullYear();

const monthPickerColumns = [
  Array.from({ length: 21 }, (_, index) => {
    const year = currentYear - 10 + index;
    return { label: `${year}年`, value: year };
  }),
  Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1}月`,
    value: index,
  })),
];

const formatMonthKeyLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return year === currentYear ? `${month}月` : `${year}年${month}月`;
};

const toMonthKey = (year: number, monthIndex: number) =>
  `${year}-${`${monthIndex + 1}`.padStart(2, "0")}`;

const shiftMonthKey = (monthKey: string, delta: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  return toMonthKey(next.getFullYear(), next.getMonth());
};

const bridalFilters: Array<{ key: "all" | BrideStage; label: string }> = [
  { key: "all", label: "全部" },
  { key: "first_deposit", label: "已预约" },
  { key: "trial", label: "已试妆" },
  { key: "completed", label: "已完成" },
];

type DailyFilterKey = "all" | "booked" | "completed";

const dailyFilters: Array<{ key: DailyFilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "booked", label: "已预约" },
  { key: "completed", label: "已完成" },
];

type CustomerKind = "bridal" | "daily";

const getStatusText = (schedule: Schedule) => {
  if (isDailyMakeup(schedule)) {
    return schedule.status === "completed" ? "已完成" : "已预约";
  }

  const stage = normalizeStage(getScheduleBrideStage(schedule));
  return stageDisplay[stage].label;
};

const getDaysUntilKeyDate = (dateKey: string) => {
  const diff =
    parseDateKey(dateKey).getTime() - parseDateKey(getTodayKey()).getTime();
  return Math.ceil(diff / DAY_MS);
};

const formatCountdown = (days: number) => {
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  return `${days} 天后`;
};

const bridalStageSteps = stageFlow.map((stage) => ({
  key: stage,
  label: stageDisplay[stage].shortLabel,
}));

const dailyStageSteps = [
  { key: "booked", label: "预约" },
  { key: "completed", label: "完成" },
];

const CustomerRow = ({
  schedule,
  entranceDelay = 0,
}: {
  schedule: Schedule;
  entranceDelay?: number;
}) => {
  const navigate = useNavigate();
  const remaining = getRemainingAmount(schedule);
  const paid = getPaidAmount(schedule);
  const billable = Number(schedule.amount ?? 0);
  const isSettled = billable > 0 && remaining === 0;
  const daily = isDailyMakeup(schedule);
  const primaryServiceSlot = getSchedulePrimaryServiceSlot(schedule);
  const keyDate = daily ? schedule.date : (primaryServiceSlot?.date ?? schedule.date);
  const daysUntil = getDaysUntilKeyDate(keyDate);
  const upcoming = daysUntil >= 0;
  const serviceSlotCount = getScheduleServiceSlots(schedule).length;
  const hasTrial = getScheduleTrialSlots(schedule).length > 0;

  const steps = daily ? dailyStageSteps : bridalStageSteps;
  const currentStep = daily
    ? schedule.status === "completed"
      ? 1
      : 0
    : Math.max(
        stageFlow.indexOf(normalizeStage(getScheduleBrideStage(schedule))),
        0,
      );
  const statusText = getStatusText(schedule);

  return (
    <button
      type="button"
      className="customer-row tap-card app-surface-card"
      style={{ animationDelay: `${entranceDelay}ms` }}
      onClick={() => navigate(`/customer/${schedule.id}`)}
    >
      <div className={`customer-row__avatar${daily ? " is-daily" : ""}`}>
        {getInitial(schedule)}
      </div>
      <div className="customer-row__main">
        <div className="customer-row__topline">
          <strong>{getCustomerName(schedule)}</strong>
        </div>
        <div className="customer-row__meta">
          <span>{formatCompactDate(keyDate)}</span>
          {!daily && hasTrial && (
            <span className="customer-row__tag">含试妆</span>
          )}
          {!daily && serviceSlotCount > 1 && (
            <span className="customer-row__tag">{serviceSlotCount} 档跟妆</span>
          )}
          {schedule.location ? (
            <span className="customer-row__location">
              {schedule.location}
            </span>
          ) : null}
        </div>
        <div
          className="customer-row__progress"
          aria-label={`阶段进度：${statusText}，第 ${currentStep + 1} / ${steps.length} 步`}
        >
          <span className="customer-row__progress-track">
            {steps.map((step, index) => {
              const dotState =
                index < currentStep
                  ? "is-done"
                  : index === currentStep
                    ? upcoming
                      ? "is-current"
                      : "is-done"
                    : "is-todo";
              return (
                <span key={step.key} className="customer-row__progress-cell">
                  <span
                    className={`customer-row__progress-link${
                      index === 0
                        ? " is-ghost"
                        : index <= currentStep
                          ? " is-done"
                          : ""
                    }`}
                  />
                  <span
                    className={`customer-row__progress-dot ${dotState}`}
                  />
                  <span
                    className={`customer-row__progress-link${
                      index === steps.length - 1
                        ? " is-ghost"
                        : index < currentStep
                          ? " is-done"
                          : ""
                    }`}
                  />
                </span>
              );
            })}
          </span>
          <span className="customer-row__progress-labels">
            {steps.map((step, index) => (
              <span
                key={step.key}
                className={index === currentStep ? "is-current" : undefined}
              >
                {step.label}
              </span>
            ))}
          </span>
        </div>
      </div>
      <div className="customer-row__side">
        {upcoming && !isSettled && schedule.status !== "completed" ? (
          <span
            className={`customer-row__countdown${
              daysUntil <= 7 ? " is-soon" : daysUntil <= 30 ? " is-near" : ""
            }`}
          >
            {formatCountdown(daysUntil)}
          </span>
        ) : null}
        {isSettled ? (
          <span className="customer-row__settled">已结清</span>
        ) : billable > 0 ? (
          <span className="customer-row__amount">
            <strong>{formatCurrency(remaining)}</strong>
            <em>待收</em>
          </span>
        ) : (
          <span className="customer-row__unpriced">
            {paid > 0 ? formatCurrency(paid) : "未报价"}
          </span>
        )}
      </div>
    </button>
  );
};

export const CustomersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { schedules } = useScheduleStore();
  const [activeStageFilter, setActiveStageFilter] = useState<
    "all" | BrideStage
  >("all");
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<DailyFilterKey>("all");
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const initialKind = searchParams.get("kind") === "daily" ? "daily" : "bridal";
  const [activeKind, setActiveKind] = useState<CustomerKind>(initialKind);

  const handleKindChange = (kind: CustomerKind) => {
    setActiveKind(kind);
    setSearchParams(kind === "daily" ? { kind } : {}, { replace: true });
  };

  const openNewCustomer = () => {
    navigate(`/schedule/new${activeKind === "daily" ? "?category=daily" : ""}`);
  };

  const activeBaseCustomers = useMemo(
    () =>
      schedules.filter(
        (schedule) =>
          schedule.status !== "cancelled" &&
          (activeKind === "daily"
            ? isDailyMakeup(schedule)
            : !isDailyMakeup(schedule))
      ),
    [activeKind, schedules]
  );

  const kindCounts = useMemo(
    () => ({
      bridal: schedules.filter(
        (schedule) =>
          schedule.status !== "cancelled" && !isDailyMakeup(schedule)
      ).length,
      daily: schedules.filter(
        (schedule) => schedule.status !== "cancelled" && isDailyMakeup(schedule)
      ).length,
    }),
    [schedules]
  );

  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const schedule of activeBaseCustomers) {
      for (const monthKey of new Set(
        getScheduleSlotDates(schedule).map((date) => date.slice(0, 7)),
      )) {
        counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeBaseCustomers]);

  const customers = useMemo(() => {
    const filtered = activeBaseCustomers.filter((schedule) => {
      if (
        activeMonth !== "all" &&
        !getScheduleSlotDates(schedule).some((date) =>
          date.startsWith(activeMonth)
        )
      ) {
        return false;
      }

      if (activeKind === "daily") {
        if (activeStatusFilter === "all") return true;
        if (activeStatusFilter === "booked") return schedule.status !== "completed";
        return schedule.status === "completed";
      }

      return (
        activeStageFilter === "all" ||
        normalizeStage(getScheduleBrideStage(schedule)) === activeStageFilter
      );
    });

    return sortSchedules(filtered);
  }, [
    activeBaseCustomers,
    activeKind,
    activeMonth,
    activeStageFilter,
    activeStatusFilter,
  ]);

  const monthSummary = useMemo(() => {
    if (activeMonth === "all") return null;

    let slotCount = 0;
    let paidAmount = 0;
    let remainingAmount = 0;
    for (const schedule of customers) {
      slotCount +=
        getScheduleServiceSlots(schedule).filter((slot) =>
          slot.date.startsWith(activeMonth)
        ).length +
        getScheduleTrialSlots(schedule).filter((slot) =>
          slot.date.startsWith(activeMonth)
        ).length;
      remainingAmount += getRemainingAmount(schedule);
      paidAmount += getPaymentEvents(schedule)
        .filter((event) => event.date.startsWith(activeMonth))
        .reduce((sum, event) => sum + event.amount, 0);
    }
    return { customerCount: customers.length, slotCount, paidAmount, remainingAmount };
  }, [activeMonth, customers]);

  const activeMonthLabel =
    activeMonth === "all" ? undefined : formatMonthKeyLabel(activeMonth);
  const baselineMonthKey = useMemo(() => {
    if (activeMonth !== "all") return activeMonth;
    const now = new Date();
    return toMonthKey(now.getFullYear(), now.getMonth());
  }, [activeMonth]);
  const stepMonth = (delta: number) =>
    setActiveMonth(shiftMonthKey(baselineMonthKey, delta));
  const monthPickerValue = useMemo(() => {
    const [year, month] = baselineMonthKey.split("-").map(Number);
    return [year, month - 1];
  }, [baselineMonthKey]);

  const totalRemaining = useMemo(
    () => customers.reduce((sum, schedule) => sum + getRemainingAmount(schedule), 0),
    [customers],
  );

  const currentFilters = activeKind === "daily" ? dailyFilters : bridalFilters;
  const activeFilter =
    activeKind === "daily" ? activeStatusFilter : activeStageFilter;

  return (
    <div className="customers-page">
      <div className="customers-page__header">
        <div className="customers-page__titlebar">
          <div className="customers-page__title-copy">
            <span className="customers-page__eyebrow">CLIENT PROGRESS</span>
            <h1 className="customers-page__title">客户进度</h1>
          </div>
          <div className="customers-page__headline">
            <strong>{formatCurrency(totalRemaining)}</strong>
            <em>筛选内待收款</em>
          </div>
        </div>
        <div
          className="customers-page__kind-tabs"
          role="tablist"
          aria-label="客户类型"
        >
          {(
            [
              ["bridal", "跟妆客户"],
              ["daily", "日常生活妆"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeKind === key}
              className={`customers-page__kind-tab${
                activeKind === key ? " is-active" : ""
              }`}
              onClick={() => handleKindChange(key)}
            >
              <span>{label}</span>
              <strong>{kindCounts[key]}</strong>
            </button>
          ))}
        </div>

        <div className="customers-page__filters" aria-label="客户筛选">
          {currentFilters.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                className={`customers-page__filter${
                  active ? " is-active" : ""
                }`}
                onClick={() => {
                  if (activeKind === "daily") {
                    setActiveStatusFilter(filter.key as DailyFilterKey);
                  } else {
                    setActiveStageFilter(filter.key as "all" | BrideStage);
                  }
                }}
              >
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        <div className="customers-page__month-nav" aria-label="按月份筛选">
          <button
            type="button"
            className="customers-page__month-nav-btn"
            aria-label="上个月"
            onClick={() => stepMonth(-1)}
          >
            <LeftOutline fontSize={14} />
          </button>
          <button
            type="button"
            className="customers-page__month-nav-title"
            onClick={() => setMonthPickerVisible(true)}
          >
            <strong>
              <CalendarOutline fontSize={13} />
              {activeMonthLabel ?? "全部月份"}
            </strong>
            <span>
              {activeMonth === "all"
                ? `共 ${activeBaseCustomers.length} 位客户`
                : `${monthCounts.get(activeMonth) ?? 0} 位客户`}
              {activeMonth !== "all" && (
                <em
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMonth("all");
                  }}
                >
                  看全部
                </em>
              )}
            </span>
          </button>
          <button
            type="button"
            className="customers-page__month-nav-btn"
            aria-label="下个月"
            onClick={() => stepMonth(1)}
          >
            <RightOutline fontSize={14} />
          </button>
        </div>

        {monthSummary && activeMonthLabel && (
          <div className="customers-page__month-summary" aria-label="月度概览">
            <span className="customers-page__month-summary-title">
              {activeMonthLabel}概览
            </span>
            <span className="customers-page__month-summary-item">
              <em>客户</em>
              <strong>{monthSummary.customerCount}位</strong>
            </span>
            <span className="customers-page__month-summary-item">
              <em>档期</em>
              <strong>{monthSummary.slotCount}档</strong>
            </span>
            <span className="customers-page__month-summary-item">
              <em>当月实收</em>
              <strong>{formatCurrency(monthSummary.paidAmount)}</strong>
            </span>
            <span className="customers-page__month-summary-item">
              <em>待收款</em>
              <strong>{formatCurrency(monthSummary.remainingAmount)}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="customers-page__scroller">
        {customers.length > 0 ? (
          <div className="customers-page__list">
            {customers.map((schedule, index) => (
              <CustomerRow
                key={schedule.id}
                schedule={schedule}
                entranceDelay={Math.min(index * 28, 220)}
              />
            ))}
          </div>
        ) : (
          <div className="customers-page__empty app-surface-card">
            <Empty description="当前筛选下没有客户" />
            <Button
              block
              color="primary"
              onClick={openNewCustomer}
            >
              新建客户
            </Button>
          </div>
        )}
      </div>

      <Picker
        visible={monthPickerVisible}
        columns={monthPickerColumns}
        title="选择月份"
        value={monthPickerValue}
        onClose={() => setMonthPickerVisible(false)}
        onConfirm={(value) => {
          const year = Number(value[0]);
          const monthIndex = Number(value[1]);
          setActiveMonth(toMonthKey(year, monthIndex));
          setMonthPickerVisible(false);
        }}
      />
    </div>
  );
};

import { useMemo, useState } from "react";
import { Button, Empty, Picker } from "antd-mobile";
import {
  CalendarOutline,
  ClockCircleOutline,
  LeftOutline,
  RightOutline,
  ShopbagOutline,
  StarOutline,
} from "antd-mobile-icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  formatCompactDate,
  formatDaysUntil,
  getCustomerName,
  getInitial,
  normalizeStage,
  stageDisplay,
} from "../../app/bridalData";
import { useScheduleStore } from "../../app/useScheduleStore";
import type {
  BrideStage,
  BridalSubtype,
  Schedule,
} from "../../types/schedule";
import {
  getBridalServiceSlotTitle,
  getJewelryNeedLabel,
  getScheduleBrideStage,
  getSchedulePrimaryServiceSlot,
  getScheduleServiceSlots,
  getScheduleSlotDates,
  getScheduleSlotLabel,
  getScheduleTrialSlots,
  getServiceSubtypeLabel,
  isDailyMakeup,
} from "../../types/schedule";
import { formatTimeRange, sortSchedules } from "../../utils/date";
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

const getCardMeta = (schedule: Schedule) => {
  const subtypeLabel = getServiceSubtypeLabel(schedule.serviceSubtype);

  if (isDailyMakeup(schedule)) {
    return subtypeLabel;
  }

  const outfitLabel = `${schedule.outfitCount ?? 0} 套服装`;
  const jewelryLabel = getJewelryNeedLabel(schedule.jewelryNeed);
  return [subtypeLabel, outfitLabel, jewelryLabel].join(" · ");
};

const getStatusText = (schedule: Schedule) => {
  if (isDailyMakeup(schedule)) {
    return schedule.status === "completed" ? "已完成" : "已预约";
  }

  const stage = normalizeStage(getScheduleBrideStage(schedule));
  return stageDisplay[stage].label;
};

const CustomerCard = ({ schedule }: { schedule: Schedule }) => {
  const navigate = useNavigate();
  const remaining = getRemainingAmount(schedule);
  const paid = getPaidAmount(schedule);
  const billable = Number(schedule.amount ?? 0);
  const isSettled = billable > 0 && remaining === 0;
  const daily = isDailyMakeup(schedule);
  const serviceTitle = daily
    ? "预约档期"
    : getBridalServiceSlotTitle(schedule.serviceSubtype as BridalSubtype);
  const note = schedule.note?.trim();
  const trialSlots = getScheduleTrialSlots(schedule);
  const serviceSlots = getScheduleServiceSlots(schedule);
  const primaryServiceSlot = getSchedulePrimaryServiceSlot(schedule);
  const showTrial =
    !daily && normalizeStage(getScheduleBrideStage(schedule)) === "first_deposit";

  return (
    <button
      type="button"
      className="customer-card tap-card bridal-scroll-card app-surface-card"
      onClick={() => navigate(`/customer/${schedule.id}`)}
    >
      <div className="customer-card__top">
        <div className="customer-card__avatar">{getInitial(schedule)}</div>
        <div className="customer-card__identity">
          <div className="customer-card__name-row">
            <strong>{getCustomerName(schedule)}</strong>
            <span
              className={`customer-card__status${daily ? " is-daily" : ""}`}
            >
              {getStatusText(schedule)}
            </span>
          </div>
          <span className="customer-card__subtype">
            {[getServiceSubtypeLabel(schedule.serviceSubtype), schedule.location]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <RightOutline className="customer-card__arrow" />
      </div>

      <div className="customer-card__info">
        {daily ? (
          <>
            <div className="customer-card__line is-primary">
              <CalendarOutline />
              <span>{`预约 ${formatCompactDate(schedule.date)}`}</span>
              <em>{formatDaysUntil(schedule.date)}</em>
            </div>
            <div className="customer-card__line">
              <ClockCircleOutline />
              <span>{formatTimeRange(schedule)}</span>
            </div>
          </>
        ) : (
          <>
            {showTrial ? (
              <div className="customer-card__schedule-row">
                <span className="customer-card__schedule-label">试妆</span>
                <strong>{trialSlots.length ? formatCompactDate(trialSlots[0].date) : "未填日期"}</strong>
                {trialSlots.length ? <em>{formatDaysUntil(trialSlots[0].date)}</em> : null}
              </div>
            ) : null}
            <div className="customer-card__schedule-row">
              <span className="customer-card__schedule-label is-main">
                {serviceTitle}
              </span>
              <strong>
                {serviceSlots.length > 1
                  ? `${formatCompactDate(primaryServiceSlot?.date ?? schedule.date)} +${serviceSlots.length - 1}`
                  : formatCompactDate(primaryServiceSlot?.date ?? schedule.date)
                }
              </strong>
              <em>{formatDaysUntil(primaryServiceSlot?.date ?? schedule.date)}</em>
            </div>
            {serviceSlots.length > 1 ? (
              <div className="customer-card__schedule-extra">
                {serviceSlots.slice(1).map((slot) => (
                  <span key={slot.id}>
                    {getScheduleSlotLabel(slot, schedule.serviceSubtype)} · {formatCompactDate(slot.date)}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="customer-card__footer">
        <div className="customer-card__tag-row">
          <span className="customer-card__mini-tag">
            <ShopbagOutline />
            {getCardMeta(schedule)}
          </span>
          {!daily && schedule.jewelryItems ? (
            <span className="customer-card__mini-tag">
              <StarOutline />
              {schedule.jewelryItems}
            </span>
          ) : null}
        </div>

        <div className="customer-card__money">
          <span>{isSettled ? "已结清" : "待收款"}</span>
          <strong>
            {isSettled ? formatCurrency(paid) : formatCurrency(remaining)}
          </strong>
        </div>
      </div>

      {note ? <p className="customer-card__note">{note}</p> : null}
    </button>
  );
};

const CustomerRow = ({ schedule }: { schedule: Schedule }) => {
  const navigate = useNavigate();
  const remaining = getRemainingAmount(schedule);
  const paid = getPaidAmount(schedule);
  const billable = Number(schedule.amount ?? 0);
  const isSettled = billable > 0 && remaining === 0;
  const daily = isDailyMakeup(schedule);
  const primaryServiceSlot = getSchedulePrimaryServiceSlot(schedule);
  const keyDate = daily ? schedule.date : (primaryServiceSlot?.date ?? schedule.date);

  return (
    <button
      type="button"
      className="customer-row tap-card app-surface-card"
      onClick={() => navigate(`/customer/${schedule.id}`)}
    >
      <div className="customer-row__avatar">{getInitial(schedule)}</div>
      <div className="customer-row__main">
        <div className="customer-row__topline">
          <strong>{getCustomerName(schedule)}</strong>
          <span className={`customer-row__status${daily ? " is-daily" : ""}`}>
            {getStatusText(schedule)}
          </span>
        </div>
        <div className="customer-row__meta">
          <span>{formatCompactDate(keyDate)}</span>
          <em>{formatDaysUntil(keyDate)}</em>
        </div>
      </div>
      <div className="customer-row__right">
        <strong className={isSettled ? "is-settled" : ""}>
          {formatCurrency(isSettled ? paid : remaining)}
        </strong>
      </div>
    </button>
  );
};

type Density = "row" | "card";
const DENSITY_STORAGE_KEY = "customers-density";

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
  const [density, setDensity] = useState<Density>(() =>
    localStorage.getItem(DENSITY_STORAGE_KEY) === "row" ? "row" : "card",
  );

  const handleDensityChange = (value: Density) => {
    setDensity(value);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, value);
    } catch {
      // ignore storage failure
    }
  };

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

  const currentFilters = activeKind === "daily" ? dailyFilters : bridalFilters;
  const activeFilter =
    activeKind === "daily" ? activeStatusFilter : activeStageFilter;

  return (
    <div className="customers-page">
      <div className="customers-page__header">
        <div className="customers-page__head-row">
          <h1 className="customers-page__title">客户进度</h1>
          <div
            className="customers-page__density"
            role="tablist"
            aria-label="视图密度"
          >
            {([
              ["row", "紧凑"],
              ["card", "详细"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={density === value}
                className={`customers-page__density-btn${
                  density === value ? " is-active" : ""
                }`}
                onClick={() => handleDensityChange(value)}
              >
                {label}
              </button>
            ))}
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
          <div
            className={`customers-page__list${
              density === "row" ? " is-row" : ""
            }`}
          >
            {customers.map((schedule) =>
              density === "row" ? (
                <CustomerRow key={schedule.id} schedule={schedule} />
              ) : (
                <CustomerCard key={schedule.id} schedule={schedule} />
              ),
            )}
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

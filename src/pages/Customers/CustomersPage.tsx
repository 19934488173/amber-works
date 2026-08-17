import { useMemo, useState } from "react";
import { Button, Empty } from "antd-mobile";
import {
  CalendarOutline,
  ClockCircleOutline,
  EnvironmentOutline,
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
  ScheduleStatus,
} from "../../types/schedule";
import {
  getBridalServiceSlotTitle,
  getJewelryNeedLabel,
  getScheduleBrideStage,
  getServiceSubtypeLabel,
  getStatusLabel,
  isDailyMakeup,
} from "../../types/schedule";
import { formatTimeRange, sortSchedules } from "../../utils/date";
import {
  formatCurrency,
  getPaidAmount,
  getRemainingAmount,
} from "../../utils/statistics";

const bridalFilters: Array<{ key: "all" | BrideStage; label: string }> = [
  { key: "all", label: "全部" },
  { key: "first_deposit", label: "已预约" },
  { key: "trial", label: "已试妆" },
  { key: "final_payment", label: "待跟妆" },
  { key: "completed", label: "已完成" },
];

const dailyFilters: Array<{ key: "all" | ScheduleStatus; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待确认" },
  { key: "confirmed", label: "已确认" },
  { key: "in_progress", label: "进行中" },
  { key: "completed", label: "已完成" },
];

type CustomerKind = "bridal" | "daily";

const formatTimeLabel = (startTime?: string, endTime?: string) => {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  return "全天";
};

const getCardMeta = (schedule: Schedule) => {
  const subtypeLabel = getServiceSubtypeLabel(schedule.serviceSubtype);

  if (isDailyMakeup(schedule)) {
    return [subtypeLabel, schedule.location || "未填场地"]
      .filter(Boolean)
      .join(" · ");
  }

  const outfitLabel = `${schedule.outfitCount ?? 0} 套服装`;
  const jewelryLabel = getJewelryNeedLabel(schedule.jewelryNeed);
  return [subtypeLabel, outfitLabel, jewelryLabel].join(" · ");
};

const getStatusText = (schedule: Schedule) => {
  if (isDailyMakeup(schedule)) return getStatusLabel(schedule.status);

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
            {getServiceSubtypeLabel(schedule.serviceSubtype)}
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
            <div className="customer-card__schedule-row">
              <div className="customer-card__schedule-head">
                <span className="customer-card__schedule-label">试妆</span>
                <strong>
                  {schedule.trialDate ? formatCompactDate(schedule.trialDate) : "未填日期"}
                </strong>
              </div>
              <div className="customer-card__schedule-meta">
                <ClockCircleOutline />
                <span>
                  {schedule.trialDate
                    ? formatTimeLabel(schedule.trialStartTime, schedule.trialEndTime)
                    : "试妆时间未填"}
                </span>
              </div>
            </div>
            <div className="customer-card__schedule-row">
              <div className="customer-card__schedule-head">
                <span className="customer-card__schedule-label is-main">
                  {serviceTitle}
                </span>
                <strong>{formatCompactDate(schedule.date)}</strong>
              </div>
              <div className="customer-card__schedule-meta">
                <ClockCircleOutline />
                <span>{formatTimeRange(schedule)}</span>
                <em>{formatDaysUntil(schedule.date)}</em>
              </div>
            </div>
          </>
        )}
        <div className="customer-card__line">
          <EnvironmentOutline />
          <span>{schedule.location || "未填写场地"}</span>
        </div>
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

export const CustomersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { schedules } = useScheduleStore();
  const [activeStageFilter, setActiveStageFilter] = useState<
    "all" | BrideStage
  >("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    "all" | ScheduleStatus
  >("all");
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

  const customers = useMemo(() => {
    const filtered = activeBaseCustomers.filter((schedule) => {
      if (activeKind === "daily") {
        return (
          activeStatusFilter === "all" || schedule.status === activeStatusFilter
        );
      }

      return (
        activeStageFilter === "all" ||
        normalizeStage(getScheduleBrideStage(schedule)) === activeStageFilter
      );
    });

    return sortSchedules(filtered);
  }, [activeBaseCustomers, activeKind, activeStageFilter, activeStatusFilter]);

  const currentFilters = activeKind === "daily" ? dailyFilters : bridalFilters;
  const activeFilter =
    activeKind === "daily" ? activeStatusFilter : activeStageFilter;

  return (
    <div className="customers-page">
      <div className="customers-page__header">
        <h1 className="text-2xl font-bold">客户进度</h1>
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
                    setActiveStatusFilter(filter.key as "all" | ScheduleStatus);
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
      </div>

      <div className="customers-page__scroller">
        {customers.length > 0 ? (
          <div className="customers-page__list">
            {customers.map((schedule) => (
              <CustomerCard key={schedule.id} schedule={schedule} />
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
    </div>
  );
};

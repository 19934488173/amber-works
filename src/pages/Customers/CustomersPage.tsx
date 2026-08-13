import { useMemo, useState } from "react";
import { Button, Empty } from "antd-mobile";
import { RightOutline, ShopbagOutline, StarOutline } from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import {
  formatCompactDate,
  formatDaysUntil,
  getCustomersByStage,
  getCustomerName,
  getInitial,
  normalizeStage,
  stageDisplay,
} from "../../app/bridalData";
import { useScheduleStore } from "../../app/useScheduleStore";
import type { BrideStage, Schedule } from "../../types/schedule";
import {
  getScheduleBrideStage,
  getJewelryNeedLabel,
} from "../../types/schedule";
import { formatCurrency, getRemainingAmount } from "../../utils/statistics";

const filters: Array<{ key: "all" | BrideStage; label: string }> = [
  { key: "all", label: "全部" },
  { key: "first_deposit", label: "已预约" },
  { key: "trial", label: "已试妆" },
  { key: "final_payment", label: "待跟妆" },
  { key: "completed", label: "已完成" },
];

type CustomerKind = "bridal" | "daily";
const isDailyMakeup = (schedule: Schedule) => schedule.title === "生活妆";

const CustomerCard = ({ schedule }: { schedule: Schedule }) => {
  const navigate = useNavigate();
  const stage = normalizeStage(getScheduleBrideStage(schedule));
  const remaining = getRemainingAmount(schedule);
  const isSettled = remaining === 0 && schedule.amount;
  const daily = isDailyMakeup(schedule);

  return (
    <button
      type="button"
      className="tap-card bridal-scroll-card grid min-h-23 w-full grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-5.5 border border-(--app-border) bg-white px-4 py-3 text-left shadow-(--app-shadow)"
      onClick={() => navigate(`/customer/${schedule.id}`)}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-(--app-surface-soft) text-[18px] font-bold text-(--app-primary)">
        {getInitial(schedule)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <strong className="truncate text-[16px] font-bold text-(--app-text)">
            {getCustomerName(schedule)}
          </strong>
          <span className="rounded-full bg-(--app-surface-soft) px-2 py-1 text-[11px] font-bold text-(--app-primary)">
            {stageDisplay[stage].label}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-(--app-muted)">
          {daily
            ? `服务日 ${formatCompactDate(schedule.date)}`
            : `婚期 ${formatCompactDate(schedule.date)}`}
          <span className="ml-3 text-(--app-primary)">
            {formatDaysUntil(schedule.date)}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-[12px] text-(--app-muted)">
          <span className="inline-flex items-center gap-1">
            <ShopbagOutline fontSize={13} />
            {daily ? "生活妆" : `${schedule.outfitCount ?? 0} 套`}
          </span>
          <span className="inline-flex items-center gap-1">
            {!daily && (
              <>
                <StarOutline fontSize={13} />
                {getJewelryNeedLabel(schedule.jewelryNeed)}
              </>
            )}
          </span>
        </p>
      </div>
      <div className="flex min-w-16.5 items-center justify-end gap-1 text-right">
        <div>
          {isSettled ? (
            <>
              <span className="rounded-full bg-(--app-surface-soft) px-2 py-1 text-[11px] font-semibold text-(--app-primary)">
                已结清
              </span>
            </>
          ) : (
            <>
              <span className="block text-[11px] text-(--app-muted)">
                待收尾款
              </span>
              <strong className="block text-[18px] font-normal text-(--app-text)">
                {formatCurrency(remaining)}
              </strong>
            </>
          )}
        </div>
        <RightOutline className="text-(--app-soft-muted)" />
      </div>
    </button>
  );
};

export const CustomersPage = () => {
  const navigate = useNavigate();
  const { schedules } = useScheduleStore();
  const [activeFilter, setActiveFilter] = useState<"all" | BrideStage>("all");
  const [activeKind, setActiveKind] = useState<CustomerKind>("bridal");
  const kindCounts = useMemo(
    () => ({
      bridal: schedules.filter((schedule) => !isDailyMakeup(schedule)).length,
      daily: schedules.filter(isDailyMakeup).length,
    }),
    [schedules]
  );
  const customers = useMemo(
    () =>
      getCustomersByStage(schedules, activeFilter).filter((schedule) =>
        activeKind === "daily"
          ? isDailyMakeup(schedule)
          : !isDailyMakeup(schedule)
      ),
    [schedules, activeFilter, activeKind]
  );

  return (
    <div className="customers-page">
      <div className="customers-page__header">
        <section className="pt-1">
          <h1 className="mt-1 text-[24px] font-bold leading-tight text-(--app-text)">
            客户进度
          </h1>
        </section>

        <div
          className="grid grid-cols-2 gap-2 rounded-2xl bg-(--app-surface-soft) p-1"
          role="tablist"
          aria-label="客户类型"
        >
          {(
            [
              ["bridal", "跟妆客户"],
              ["daily", "生活妆"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeKind === key}
              className={`min-h-11 rounded-xl text-[14px] font-bold transition-colors ${
                activeKind === key
                  ? "bg-white text-(--app-primary) shadow-sm"
                  : "text-(--app-muted)"
              }`}
              onClick={() => {
                setActiveKind(key);
                setActiveFilter("all");
              }}
            >
              {label}
              <span className="ml-1 text-[12px] font-normal opacity-70">
                {kindCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {activeKind === "bridal" && (
          <div className="customers-page__filters">
            {filters.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  className={`min-h-11 shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors ${
                    active
                      ? "bg-(--app-primary) text-white shadow-[0_8px_18px_rgba(169,63,95,0.2)]"
                      : "bg-(--app-surface-soft) text-(--app-primary-dark)"
                  }`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="customers-page__scroller">
        {customers.length > 0 ? (
          <div className="space-y-3">
            {customers.map((schedule) => (
              <CustomerCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-(--app-border) bg-white py-8 shadow-(--app-shadow)">
            <Empty description="当前筛选下没有客户" />
            <div className="px-5 pt-4">
              <Button
                block
                color="primary"
                onClick={() => navigate("/schedule/new")}
              >
                新建客户
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

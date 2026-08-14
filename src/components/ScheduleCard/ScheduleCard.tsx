import { Card, SwipeAction, Tag } from "antd-mobile";
import type { Action } from "antd-mobile/es/components/swipe-action";
import { EnvironmentOutline, RightOutline } from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import { BrideStageBadge } from "../StatusBadge/StatusBadge";
import type { Schedule } from "../../types/schedule";
import {
  getJewelryNeedLabel,
  getScheduleBrideStage,
  getServiceSubtypeLabel,
  isDailyMakeup,
} from "../../types/schedule";
import { formatFullDate, formatTimeRange } from "../../utils/date";
import {
  formatCurrency,
  getBillableAmount,
  getPaidAmount,
  getRemainingAmount,
} from "../../utils/statistics";

type Props = {
  schedule: Schedule;
  onComplete?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
  onDuplicate?: (schedule: Schedule) => void;
};

export const ScheduleCard = ({
  schedule,
  onComplete,
  onDelete,
  onDuplicate,
}: Props) => {
  const navigate = useNavigate();
  const title = schedule.customer
    ? `${schedule.customer} · ${schedule.title}`
    : schedule.title;
  const amount = getBillableAmount(schedule);
  const paidAmount = getPaidAmount(schedule);
  const remainingAmount = getRemainingAmount(schedule);
  const stage = getScheduleBrideStage(schedule);
  const daily = isDailyMakeup(schedule);
  const typeLabel = getServiceSubtypeLabel(schedule.serviceSubtype);
  const outfitLabel = daily
    ? typeLabel
    : schedule.outfitCount
      ? `${typeLabel} · ${schedule.outfitCount} 套`
      : typeLabel;
  const jewelryLabel = schedule.jewelryNeed
    ? getJewelryNeedLabel(schedule.jewelryNeed)
    : daily ? null : "饰品未记";
  const actions: Action[] = [];
  if (onComplete)
    actions.push({
      key: "complete",
      text: "完成",
      color: "success",
      onClick: () => onComplete(schedule),
    });
  if (onDuplicate)
    actions.push({
      key: "copy",
      text: "复制",
      color: "primary",
      onClick: () => onDuplicate(schedule),
    });
  if (onDelete)
    actions.push({
      key: "delete",
      text: "删除",
      color: "danger",
      onClick: () => onDelete(schedule),
    });

  return (
    <SwipeAction closeOnAction rightActions={actions}>
      <Card
        className={`schedule-card${remainingAmount > 0 ? " has-balance" : ""}`}
        onClick={() => navigate(`/customer/${schedule.id}`)}
      >
        <div className="schedule-card__head">
          <div className="schedule-card__date">
            <strong>{formatFullDate(schedule.date)}</strong>
            <span>{formatTimeRange(schedule)}</span>
          </div>
          <div className="schedule-card__badges">
            <Tag color={daily ? "#0f766e" : "#be185d"} round>
              {typeLabel}
            </Tag>
            {!daily && <BrideStageBadge stage={stage} />}
          </div>
        </div>
        <div className="schedule-card__main">
          <div className="schedule-card__avatar">
            {(schedule.customer || schedule.title).slice(0, 1)}
          </div>
          <div className="schedule-card__content">
            <div className="schedule-card__title">{title}</div>
            {schedule.location && (
              <div className="schedule-card__meta">
                <EnvironmentOutline />
                <span>{schedule.location}</span>
              </div>
            )}
          </div>
          <RightOutline className="schedule-card__arrow" />
        </div>
        <div className="schedule-card__money">
          <div>
            <span>报价</span>
            <strong>{amount > 0 ? formatCurrency(amount) : "未填写"}</strong>
          </div>
          <div>
            <span>已收</span>
            <strong>{formatCurrency(paidAmount)}</strong>
          </div>
          <div>
            <span>尾款</span>
            <strong className={remainingAmount > 0 ? "is-danger" : ""}>
              {formatCurrency(remainingAmount)}
            </strong>
          </div>
        </div>
        <div className="schedule-card__details">
          <span>{outfitLabel}</span>
          {jewelryLabel ? <span>{jewelryLabel}</span> : null}
        </div>
        {schedule.jewelryItems && (
          <div className="schedule-card__note">
            饰品：{schedule.jewelryItems}
          </div>
        )}
      </Card>
    </SwipeAction>
  );
};

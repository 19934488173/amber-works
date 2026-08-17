import { useMemo, useState } from "react";
import { DatePicker, Empty, Form, Input, Modal, Toast } from "antd-mobile";
import {
  BillOutline,
  LeftOutline,
  ReceivePaymentOutline,
  RightOutline,
} from "antd-mobile-icons";
import { getCustomerName } from "../../app/bridalData";
import { useScheduleStore } from "../../app/useScheduleStore";
import {
  formatCurrency,
  formatSignedCurrency,
  getMonthKey,
  getPaymentEvents,
  getRemainingAmount,
} from "../../utils/statistics";
import { addMonths, formatYearMonth, toDateKey } from "../../utils/date";
import type { Schedule, ScheduleDraft } from "../../types/schedule";

type MonthSummary = {
  monthKey: string;
  received: number;
  paymentCount: number;
  pendingAmount: number;
  pendingCount: number;
  payments: ReturnType<typeof getPaymentEvents>;
};

type YearSummary = {
  year: number;
  received: number;
  paymentCount: number;
  pendingAmount: number;
};

const formatPaymentDate = (date: string) => {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
};

const activeSchedules = (schedules: Schedule[]) =>
  schedules.filter((schedule) => schedule.status !== "cancelled");

const getPositiveTotal = (items: Array<{ amount: number }>) =>
  items.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);

const createMonthSummary = (schedules: Schedule[], monthDate: Date): MonthSummary => {
  const monthKey = getMonthKey(monthDate);
  const schedulesInMonth = activeSchedules(schedules).filter((schedule) => schedule.date.startsWith(monthKey));
  const payments = activeSchedules(schedules)
    .flatMap((schedule) => getPaymentEvents(schedule))
    .filter((event) => event.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));
  const pendingSchedules = schedulesInMonth.filter((schedule) => getRemainingAmount(schedule) > 0);

  return {
    monthKey,
    received: getPositiveTotal(payments),
    paymentCount: payments.length,
    pendingAmount: pendingSchedules.reduce((sum, schedule) => sum + getRemainingAmount(schedule), 0),
    pendingCount: pendingSchedules.length,
    payments,
  };
};

const createYearSummary = (schedules: Schedule[], year: number): YearSummary => {
  const yearKey = String(year);
  const yearSchedules = activeSchedules(schedules).filter((schedule) => schedule.date.startsWith(yearKey));
  const payments = activeSchedules(schedules)
    .flatMap((schedule) => getPaymentEvents(schedule))
    .filter((event) => event.date.startsWith(`${yearKey}-`));

  return {
    year,
    received: getPositiveTotal(payments),
    paymentCount: payments.length,
    pendingAmount: yearSchedules.reduce((sum, schedule) => sum + getRemainingAmount(schedule), 0),
  };
};

export const IncomePage = () => {
  const { schedules, createSchedule } = useScheduleStore();
  const [quickVisible, setQuickVisible] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [form] = Form.useForm<{ amount: string; note?: string }>();
  const monthSummary = useMemo(
    () => createMonthSummary(schedules, selectedMonth),
    [schedules, selectedMonth],
  );
  const yearSummary = useMemo(
    () => createYearSummary(schedules, selectedMonth.getFullYear()),
    [schedules, selectedMonth],
  );
  const isCurrentMonth = getMonthKey(selectedMonth) === getMonthKey(new Date());

  const saveQuickIncome = async (values: { amount: string; note?: string }) => {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Toast.show("请输入正确的收款金额");
      return;
    }

    const dateKey = toDateKey(date);
    const draft: ScheduleDraft = {
      title: "上镜妆",
      serviceCategory: "daily",
      serviceSubtype: "on_camera",
      date: dateKey,
      startTime: undefined,
      endTime: undefined,
      status: "completed",
      customer: values.note?.trim() || "生活妆客人",
      amount,
      paymentRecords: [
        {
          id: crypto.randomUUID(),
          kind: "final_payment",
          label: "服务尾款",
          date: dateKey,
          amount,
          createdAt: new Date().toISOString(),
        },
      ],
      brideStage: "completed",
      referenceImages: [],
    };

    await createSchedule(draft);
    setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setQuickVisible(false);
    form.resetFields();
    Toast.show("已记账，收入已计入当天");
  };

  const switchMonth = (delta: number) => {
    setSelectedMonth((current) => addMonths(current, delta));
  };

  const goCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className="income-page">
      <section className="income-page__hero">
        <div className="income-page__hero-copy">
          <span className="income-page__eyebrow">月度账目</span>
          <h1 className="income-page__title">收入账目</h1>
          <p className="income-page__subtitle">按月份查看流水，年度只保留总览。</p>
        </div>
        <button
          type="button"
          className="income-page__quick-btn"
          onClick={() => setQuickVisible(true)}
        >
          + 记录生活妆收入
        </button>
      </section>

      <section className="income-page__month-card">
        <div className="income-page__month-switch" aria-label="切换月份">
          <button
            type="button"
            className="income-page__year-btn"
            aria-label="上个月"
            onClick={() => switchMonth(-1)}
          >
            <LeftOutline fontSize={16} />
          </button>
          <div className="income-page__month-title">
            <strong>{formatYearMonth(selectedMonth)}</strong>
            <span>{isCurrentMonth ? "本月" : "查看该月流水"}</span>
          </div>
          <button
            type="button"
            className="income-page__year-btn"
            aria-label="下个月"
            onClick={() => switchMonth(1)}
          >
            <RightOutline fontSize={16} />
          </button>
        </div>
        {!isCurrentMonth ? (
          <button type="button" className="income-page__today-btn" onClick={goCurrentMonth}>
            回到本月
          </button>
        ) : null}
      </section>

      <section className="income-page__stats">
        <article className="income-page__stat is-received">
          <div className="income-page__stat-icon">
            <ReceivePaymentOutline fontSize={16} />
          </div>
          <p className="income-page__stat-label">本月实收</p>
          <strong className="income-page__stat-value">
            {formatCurrency(monthSummary.received)}
          </strong>
          <span className="income-page__stat-meta">{monthSummary.paymentCount} 笔流水</span>
        </article>
        <article className="income-page__stat is-pending">
          <div className="income-page__stat-icon">
            <BillOutline fontSize={16} />
          </div>
          <p className="income-page__stat-label">本月待收</p>
          <strong className="income-page__stat-value">
            {formatCurrency(monthSummary.pendingAmount)}
          </strong>
          <span className="income-page__stat-meta">{monthSummary.pendingCount} 位客户</span>
        </article>
      </section>

      <section className="income-page__year-strip">
        <div>
          <span>{yearSummary.year} 年总览</span>
          <strong>{formatCurrency(yearSummary.received)}</strong>
        </div>
        <dl>
          <div>
            <dt>实收</dt>
            <dd>{formatCurrency(yearSummary.received)}</dd>
          </div>
          <div>
            <dt>待收</dt>
            <dd>{formatCurrency(yearSummary.pendingAmount)}</dd>
          </div>
          <div>
            <dt>流水</dt>
            <dd>{yearSummary.paymentCount} 笔</dd>
          </div>
        </dl>
      </section>

      <section className="income-page__section">
        <header className="income-page__section-head">
          <div>
            <h2 className="income-page__section-title">{formatYearMonth(selectedMonth)}流水</h2>
            <p className="income-page__card-hint">
              实收 {formatCurrency(monthSummary.received)} · {monthSummary.paymentCount} 笔流水
            </p>
          </div>
          {monthSummary.payments.length > 0 ? (
            <span className="income-page__section-count">{monthSummary.payments.length} 笔</span>
          ) : null}
        </header>
        {monthSummary.payments.length > 0 ? (
          <div className="income-page__payments">
            {monthSummary.payments.map((event) => (
              <div
                className={`income-page__payment${event.amount < 0 ? " is-negative" : ""}`}
                key={`${event.schedule.id}-${event.type}-${event.date}`}
              >
                <div className="income-page__payment-main">
                  <strong className="income-page__payment-name">
                    {getCustomerName(event.schedule)}
                  </strong>
                  <span className="income-page__payment-meta">
                    <em>{event.label}</em>
                    {formatPaymentDate(event.date)}
                  </span>
                </div>
                <span className="income-page__payment-amount">
                  {formatSignedCurrency(event.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="income-page__empty">
            <Empty description="这个月还没有到账记录" />
          </div>
        )}
      </section>

      <Modal
        visible={quickVisible}
        className="quick-income-modal"
        bodyClassName="quick-income-modal__body"
        content={
          <Form
            className="quick-income-form"
            form={form}
            layout="vertical"
            onFinish={saveQuickIncome}
            initialValues={{ amount: "400" }}
          >
            <div className="quick-income-form__header">
              <span>QUICK INCOME</span>
              <h2>生活妆快速记账</h2>
            </div>
            <Form.Item label="收款日期">
              <button
                type="button"
                className="income-page__modal-date"
                onClick={() => setDateVisible(true)}
              >
                {date.toLocaleDateString("zh-CN")}
              </button>
            </Form.Item>
            <Form.Item
              label="实收金额"
              name="amount"
              rules={[{ required: true, message: "请输入金额" }]}
            >
              <Input type="number" inputMode="decimal" placeholder="400" />
            </Form.Item>
            <Form.Item label="备注（可选）" name="note">
              <Input placeholder="如：小雅 / 日常妆" />
            </Form.Item>
          </Form>
        }
        actions={[
          {
            key: "cancel",
            text: "取消",
            className: "quick-income-modal__cancel",
            onClick: () => setQuickVisible(false),
          },
          {
            key: "submit",
            text: "保存记账",
            primary: true,
            className: "quick-income-modal__submit",
            onClick: () => form.submit(),
          },
        ]}
        onClose={() => setQuickVisible(false)}
      />
      <DatePicker
        visible={dateVisible}
        precision="day"
        value={date}
        onClose={() => setDateVisible(false)}
        onConfirm={(value) => {
          setDate(value);
          setDateVisible(false);
        }}
      />
    </div>
  );
};

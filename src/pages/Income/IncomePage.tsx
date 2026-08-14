import { useMemo, useState } from "react";
import { DatePicker, Empty, Form, Input, Modal, Toast } from "antd-mobile";
import {
  BillOutline,
  PayCircleOutline,
  ReceivePaymentOutline,
} from "antd-mobile-icons";
import {
  getCustomerName,
  getIncomeSummary,
  getMonthlyIncomeRows,
} from "../../app/bridalData";
import { useScheduleStore } from "../../app/useScheduleStore";
import { formatCurrency } from "../../utils/statistics";
import { toDateKey } from "../../utils/date";
import type { ScheduleDraft } from "../../types/schedule";

const formatPaymentDate = (date: string) => {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
};

export const IncomePage = () => {
  const { schedules, createSchedule } = useScheduleStore();
  const [quickVisible, setQuickVisible] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const [form] = Form.useForm<{ amount: string; note?: string }>();
  const summary = useMemo(() => getIncomeSummary(schedules), [schedules]);
  const incomeRows = useMemo(
    () => getMonthlyIncomeRows(schedules),
    [schedules]
  );
  const monthPayments = summary.monthPayments.slice(0, 6);

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
      type: "shoot",
      status: "completed",
      customer: values.note?.trim() || "生活妆客人",
      amount,
      paymentRecords: [{
        id: crypto.randomUUID(),
        kind: "final_payment",
        label: "服务尾款",
        date: dateKey,
        amount,
        createdAt: new Date().toISOString(),
      }],
      brideStage: "completed",
      referenceImages: [],
    };
    await createSchedule(draft);
    setQuickVisible(false);
    form.resetFields();
    Toast.show("已记账，收入已计入当天");
  };

  return (
    <div className="income-page">
      <section className="income-page__hero">
        <h1 className="income-page__title">收入账目</h1>
        <button
          type="button"
          className="income-page__quick-btn"
          onClick={() => setQuickVisible(true)}
        >
          + 记录生活妆收入
        </button>
      </section>

      <section className="income-page__stats">
        <article className="income-page__stat is-received">
          <div className="income-page__stat-icon">
            <ReceivePaymentOutline fontSize={16} />
          </div>
          <p className="income-page__stat-label">本月实收</p>
          <strong className="income-page__stat-value">
            {formatCurrency(summary.received)}
          </strong>
          <span className="income-page__stat-meta">
            {summary.paymentCount} 笔到账
          </span>
        </article>
        <article className="income-page__stat is-pending">
          <div className="income-page__stat-icon">
            <BillOutline fontSize={16} />
          </div>
          <p className="income-page__stat-label">待收尾款</p>
          <strong className="income-page__stat-value">
            {formatCurrency(summary.pending)}
          </strong>
          <span className="income-page__stat-meta">
            {summary.pendingCount} 位客户
          </span>
        </article>
      </section>

      <section className="income-page__card">
        <header className="income-page__card-head">
          <h2 className="income-page__card-title">每月收入</h2>
          <span className="income-page__card-hint">近 4 个月</span>
        </header>
        <div className="income-page__chart">
          {incomeRows.map((row, index) => (
            <div className="income-page__chart-row" key={row.monthKey}>
              <div className="income-page__chart-label">
                <span className={index === 0 ? "is-current" : ""}>
                  {row.label}
                </span>
                {index === 0 ? <em>本月</em> : null}
              </div>
              <div className="income-page__chart-bar">
                <div
                  className={`income-page__chart-fill${
                    index === 0 ? " is-current" : ""
                  }`}
                  style={{ width: `${row.percent}%` }}
                  aria-label={`${row.label} 收入 ${formatCurrency(row.paid)}`}
                />
              </div>
              <span className="income-page__chart-amount">
                {formatCurrency(row.paid)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="income-page__section">
        <header className="income-page__section-head">
          <h2 className="income-page__section-title">本月到账明细</h2>
          {monthPayments.length > 0 ? (
            <span className="income-page__section-count">
              {monthPayments.length} 笔
            </span>
          ) : null}
        </header>
        {monthPayments.length > 0 ? (
          <div className="income-page__payments">
            {monthPayments.map((event) => (
              <div
                className="income-page__payment"
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
                  +{formatCurrency(event.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="income-page__empty">
            <Empty description="本月还没有到账记录" />
          </div>
        )}
      </section>

      <p className="income-page__hint">
        <PayCircleOutline fontSize={14} />
        收入按每笔收款日期统计，尾款按客户报价减已收金额计算。
      </p>

      <Modal
        visible={quickVisible}
        title="生活妆快速记账"
        content={
          <Form
            form={form}
            layout="vertical"
            onFinish={saveQuickIncome}
            initialValues={{ amount: "400" }}
          >
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
            onClick: () => setQuickVisible(false),
          },
          { key: "submit", text: "保存记账", onClick: () => form.submit() },
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

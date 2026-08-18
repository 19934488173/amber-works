import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Dialog,
  Empty,
  Form,
  ImageUploader,
  Input,
  NavBar,
  ProgressBar,
  Selector,
  Toast,
  TextArea,
} from "antd-mobile";
import type { ImageUploadItem } from "antd-mobile/es/components/image-uploader";
import {
  CalendarOutline,
  CheckOutline,
  DeleteOutline,
  EditSOutline,
  EnvironmentOutline,
  ClockCircleOutline,
  MinusCircleOutline,
  PayCircleOutline,
  PhonebookOutline,
  PictureOutline,
  RightOutline,
  ShopbagOutline,
  StarOutline,
} from "antd-mobile-icons";
import { useNavigate, useParams } from "react-router-dom";
import { AppLoading } from "../../components/AppLoading/AppLoading";
import {
  fileToDataUrl,
  formatCompactDate,
  formValuesFromSchedule,
  getCustomerName,
  getInitial,
  getReferenceImages,
  mergeReferenceImages,
  normalizeStage,
  referenceImageGroups,
  stageDisplay,
  stageFlow,
  stageToStatus,
  toUploadItems,
} from "../../app/bridalData";
import type { CustomerFormValues } from "../../app/bridalData";
import { draftFromForm } from "../../app/bridalData";
import { useScheduleStore } from "../../app/useScheduleStore";
import { CustomerProfileForm } from "../ScheduleEditor/ScheduleEditorPage";
import type {
  BrideStage,
  BridalSubtype,
  PaymentRecordKind,
  ReferenceImageGroup,
  Schedule,
  ScheduleDraft,
} from "../../types/schedule";
import {
  getBridalServiceSlotTitle,
  getJewelryNeedLabel,
  getPaymentKindLabel,
  getPaymentKindOptions,
  getScheduleBrideStage,
  getSchedulePrimaryServiceSlot,
  getScheduleServiceSlots,
  getScheduleSlotLabel,
  getScheduleTrialSlots,
  getServiceCategoryLabel,
  getServiceSubtypeLabel,
  getStatusLabel,
  isDailyMakeup,
} from "../../types/schedule";
import {
  formatCurrency,
  formatSignedCurrency,
  getBillableAmount,
  getPaidAmount,
  getPaymentEvents,
  getRemainingAmount,
} from "../../utils/statistics";
import { formatTimeRange } from "../../utils/date";
import { toDateKey } from "../../utils/date";

type DetailTileProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
};

const DetailTile = ({ icon, label, value, helper }: DetailTileProps) => (
  <div className="customer-detail__tile">
    <div className="customer-detail__tile-icon">{icon}</div>
    <div className="customer-detail__tile-content">
      <p className="customer-detail__tile-label">{label}</p>
      <strong className="customer-detail__tile-value">{value}</strong>
      {helper ? (
        <span className="customer-detail__tile-helper">{helper}</span>
      ) : null}
    </div>
  </div>
);

const buildDraft = (
  schedule: Schedule,
  overrides: Partial<ScheduleDraft>
): ScheduleDraft => ({
  title: schedule.title,
  serviceCategory: schedule.serviceCategory,
  serviceSubtype: schedule.serviceSubtype,
  date: schedule.date,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  status: schedule.status,
  customer: schedule.customer,
  phone: schedule.phone,
  location: schedule.location,
  amount: schedule.amount,
  trialDate: schedule.trialDate,
  trialStartTime: schedule.trialStartTime,
  trialEndTime: schedule.trialEndTime,
  brideStage: schedule.brideStage,
  outfitCount: schedule.outfitCount,
  jewelryNeed: schedule.jewelryNeed,
  jewelryItems: schedule.jewelryItems,
  note: schedule.note,
  referenceImages: schedule.referenceImages,
  paymentRecords: schedule.paymentRecords,
  serviceSlots: schedule.serviceSlots,
  ...overrides,
});

const nextStage = (stage: BrideStage): BrideStage | null => {
  const normalized = normalizeStage(stage);
  const index = stageFlow.indexOf(normalized);
  if (index < 0 || index >= stageFlow.length - 1) return null;
  return stageFlow[index + 1];
};

const stageIndex = (stage: BrideStage) => {
  const normalized = normalizeStage(stage);
  const index = stageFlow.indexOf(normalized);
  return index < 0 ? 0 : index;
};

type PaymentDialogMode = "receive" | "deduct";

const PaymentDialogContent = ({
  schedule,
  mode,
  onSubmit,
}: {
  schedule: Schedule;
  mode: PaymentDialogMode;
  onSubmit: (values: {
    amount: number;
    kind: PaymentRecordKind;
    label: string;
    date: string;
  }) => Promise<void>;
}) => {
  const category = schedule.serviceCategory;
  const paymentKindOptions = getPaymentKindOptions(category);
  const [form] = Form.useForm<{
    amount?: string;
    kind?: PaymentRecordKind[];
    label?: string;
  }>();
  const [date, setDate] = useState(() => new Date());
  const [dateVisible, setDateVisible] = useState(false);
  const remaining = getRemainingAmount(schedule);
  const paid = getPaidAmount(schedule);
  const isDeduction = mode === "deduct";

  return (
    <>
      <Form
        className={`payment-dialog-form${isDeduction ? " is-deduction" : ""}`}
        form={form}
        layout="vertical"
        initialValues={{ kind: [isDeduction ? "other" : "final_payment"] }}
        onFinish={async (values) => {
          const amount = Number(values.amount);
          const kind = isDeduction ? "other" : values.kind?.[0] ?? "other";
          if (!Number.isFinite(amount) || amount <= 0) {
            Toast.show("请输入有效金额");
            return;
          }
          await onSubmit({
            amount: isDeduction ? -amount : amount,
            kind,
            label:
              values.label?.trim() ||
              (isDeduction ? "冲减" : getPaymentKindLabel(kind, category)),
            date: toDateKey(date),
          });
          Dialog.clear();
        }}
        footer={
          <div className="payment-dialog-form__actions">
            <Button
              block
              fill="none"
              className="payment-dialog-form__cancel"
              onClick={() => Dialog.clear()}
            >
              取消
            </Button>
            <Button
              block
              color="primary"
              className="payment-dialog-form__submit"
              onClick={() => form.submit()}
            >
              {isDeduction ? "确认冲减" : "确认添加"}
            </Button>
          </div>
        }
      >
        <div className="payment-dialog-form__header">
          <span>{isDeduction ? "ADJUSTMENT" : "PAYMENT"}</span>
          <h2>{isDeduction ? "记减 / 冲减账目" : "添加收款记录"}</h2>
        </div>
        <div className="payment-dialog-form__summary">
          <div>
            <span>当前客户</span>
            <strong>{getCustomerName(schedule)}</strong>
          </div>
          <div>
            <span>{isDeduction ? "已收金额" : "待收金额"}</span>
            <strong>{formatCurrency(isDeduction ? paid : remaining)}</strong>
          </div>
        </div>
        {isDeduction ? null : (
          <Form.Item
            label="收款明目"
            name="kind"
            className="payment-dialog-form__kind"
          >
            <Selector columns={2} options={paymentKindOptions} />
          </Form.Item>
        )}
        <Form.Item label={isDeduction ? "冲减说明" : "自定义明目"} name="label">
          <Input
            placeholder={
              isDeduction
                ? "如：退定金 / 退款 / 输入错误冲减"
                : "如：试妆定金 / 复定款 / 妈妈妆加收"
            }
          />
        </Form.Item>
        <Form.Item label="收款日期">
          <Button
            block
            fill="none"
            className="payment-dialog-form__date-btn"
            onClick={() => setDateVisible(true)}
          >
            <strong>{date.toLocaleDateString("zh-CN")}</strong>
          </Button>
        </Form.Item>
        <Form.Item label={isDeduction ? "冲减金额" : "收款金额"} name="amount">
          <Input
            placeholder={isDeduction ? "例如：300" : "例如：1500"}
            type="number"
            inputMode="decimal"
          />
        </Form.Item>
      </Form>
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
    </>
  );
};

const NoteDialogContent = ({
  schedule,
  onSubmit,
}: {
  schedule: Schedule;
  onSubmit: (note: string) => Promise<void>;
}) => {
  const [form] = Form.useForm<{ note?: string }>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ note: schedule.note }}
      onFinish={async (values) => {
        await onSubmit(values.note?.trim() ?? "");
        Dialog.clear();
      }}
      footer={
        <Button block color="primary" onClick={() => form.submit()}>
          保存备注
        </Button>
      }
    >
      <Form.Item label="需求备注" name="note">
        <TextArea rows={4} placeholder="记录客人的喜好、忌讳、特殊要求" />
      </Form.Item>
    </Form>
  );
};

export const CustomerDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { schedules, state, updateSchedule, removeSchedule } =
    useScheduleStore();
  const [editing, setEditing] = useState(false);
  const schedule = useMemo(
    () => schedules.find((item) => item.id === id),
    [schedules, id]
  );

  if (!schedule) {
    return (
      <div className="min-h-dvh bg-(--app-bg)">
        <NavBar
          className="border-b border-(--app-border) bg-white"
          onBack={() => navigate(-1)}
        >
          客户档案
        </NavBar>
        {state === "loading" || state === "idle" ? (
          <AppLoading tone="compact" title="正在读取客户档案" description="同步完成后会自动打开" />
        ) : (
          <div className="px-5 pt-8">
            <Empty description="没有找到客户档案" />
          </div>
        )}
      </div>
    );
  }

  const stage = normalizeStage(getScheduleBrideStage(schedule));
  const currentStageIndex = stageIndex(stage);
  const currentNextStage = nextStage(stage);
  const daily = isDailyMakeup(schedule);
  const subtypeLabel = getServiceSubtypeLabel(schedule.serviceSubtype);
  const categoryLabel = getServiceCategoryLabel(schedule.serviceCategory);
  const serviceDayTitle = daily
    ? "预约时间"
    : getBridalServiceSlotTitle(schedule.serviceSubtype as BridalSubtype);
  const trialSlots = getScheduleTrialSlots(schedule);
  const serviceSlots = getScheduleServiceSlots(schedule);
  const primaryServiceSlot = getSchedulePrimaryServiceSlot(schedule);
  const totalAmount = getBillableAmount(schedule);
  const paidAmount = getPaidAmount(schedule);
  const remainingAmount = getRemainingAmount(schedule);
  const payments = getPaymentEvents(schedule);

  const updateDraft = async (overrides: Partial<ScheduleDraft>) => {
    await updateSchedule(schedule.id, buildDraft(schedule, overrides));
  };

  const saveProfile = async (values: CustomerFormValues) => {
    await updateSchedule(schedule.id, draftFromForm(values, schedule));
    setEditing(false);
    Toast.show("已更新客户资料");
  };

  const advanceStage = async () => {
    if (!currentNextStage) return;
    const today = new Date().toISOString().slice(0, 10);
    const overrides: Partial<ScheduleDraft> = {
      brideStage: currentNextStage,
      status: stageToStatus(currentNextStage),
    };

    if (currentNextStage === "completed" && remainingAmount > 0) {
      overrides.paymentRecords = [
        ...(schedule.paymentRecords ?? []),
        {
          id: crypto.randomUUID(),
          kind: "final_payment",
          label: daily ? "服务尾款" : "跟妆尾款",
          date: today,
          amount: remainingAmount,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    await updateDraft(overrides);
    Toast.show(`已推进到「${stageDisplay[currentNextStage].label}」`);
  };

  const handleImagesChange = async (
    group: ReferenceImageGroup,
    items: ImageUploadItem[]
  ) => {
    await updateDraft({
      referenceImages: mergeReferenceImages(schedule, group, items),
    });
  };

  const openPaymentDialog = (mode: PaymentDialogMode) => {
    Dialog.show({
      className: "customer-payment-dialog",
      bodyClassName: "customer-payment-dialog__body",
      content: (
        <PaymentDialogContent
          schedule={schedule}
          mode={mode}
          onSubmit={async ({ amount, kind, label, date }) => {
            const isDeduction = amount < 0;
            const rest = getRemainingAmount(schedule);
            const nextAmount = isDeduction
              ? amount
              : Math.min(amount, rest || amount);
            const willSettle = !isDeduction && rest > 0 && nextAmount >= rest;
            await updateDraft({
              paymentRecords: [
                ...(schedule.paymentRecords ?? []),
                {
                  id: crypto.randomUUID(),
                  kind,
                  label,
                  date,
                  amount: nextAmount,
                  createdAt: new Date().toISOString(),
                },
              ],
              brideStage: willSettle ? "completed" : schedule.brideStage,
              status: willSettle ? "completed" : schedule.status,
            });
            Toast.show(isDeduction ? "已记录冲减" : "已添加收款");
          }}
        />
      ),
      closeOnMaskClick: true,
    });
  };

  const removePaymentRecord = (recordId?: string) => {
    if (!recordId) return;
    void Dialog.confirm({
      content: "删除这笔账目流水？此操作不可恢复。",
      confirmText: "删除",
      onConfirm: async () => {
        await updateDraft({
          paymentRecords: schedule.paymentRecords.filter(
            (record) => record.id !== recordId
          ),
        });
        Toast.show("已删除流水");
      },
    });
  };

  const confirmDeleteSchedule = () => {
    void Dialog.confirm({
      content: `删除「${schedule.customer || schedule.title}」？客户资料、图片和账目都会一起删除。`,
      confirmText: "删除",
      onConfirm: async () => {
        await removeSchedule(schedule.id);
        Toast.show("已删除档期");
        navigate("/calendar", { replace: true });
      },
    });
  };

  const editNote = () => {
    Dialog.show({
      title: "编辑需求备注",
      content: (
        <NoteDialogContent
          schedule={schedule}
          onSubmit={async (note) => {
            await updateDraft({ note: note || undefined });
            Toast.show("已更新备注");
          }}
        />
      ),
      closeOnMaskClick: true,
    });
  };

  if (editing) {
    return (
      <CustomerProfileForm
        title="编辑客户资料"
        submitText="保存修改"
        initialValues={formValuesFromSchedule(schedule)}
        onSubmit={saveProfile}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-(--app-bg)">
      <NavBar
        className="customer-detail__navbar sticky top-0 z-10 border-b border-(--app-border) bg-white"
        onBack={() => navigate(-1)}
      >
        客户档案
      </NavBar>

      <div className="customer-detail">
        <section className="customer-detail__hero">
          <div className="customer-detail__hero-top">
            <div className="customer-detail__identity">
              <div className="customer-detail__avatar">
                {getInitial(schedule)}
              </div>
              <div className="min-w-0">
                <div className="customer-detail__name-row">
                  <h1 className="customer-detail__name">
                    {getCustomerName(schedule)}
                  </h1>
                  <span
                    className={`customer-detail__status-pill${
                      daily ? " is-daily" : ""
                    }`}
                  >
                    {daily
                      ? getStatusLabel(schedule.status)
                      : stageDisplay[stage].label}
                  </span>
                </div>
                <p className="customer-detail__service">
                  {categoryLabel} · {subtypeLabel}
                </p>
                {schedule.phone ? (
                  <p className="customer-detail__phone">
                    <PhonebookOutline fontSize={14} />
                    {schedule.phone}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="customer-detail__edit-btn"
              onClick={() => setEditing(true)}
              aria-label="编辑客户资料"
            >
              <EditSOutline fontSize={15} />
            </button>
          </div>

          <div className="customer-detail__hero-summary">
            <div className="customer-detail__summary-item">
              <span className="customer-detail__summary-label">
                <CalendarOutline fontSize={14} />
                {daily ? "预约时间" : "服务日期"}
              </span>
              <strong className="customer-detail__summary-value">
                {daily
                  ? formatCompactDate(schedule.date)
                  : formatCompactDate(primaryServiceSlot?.date ?? schedule.date)}
              </strong>
            </div>
            <div className="customer-detail__summary-item">
              <span className="customer-detail__summary-label">
                <PayCircleOutline fontSize={14} />
                {daily ? "预约状态" : "档期金额"}
              </span>
              <strong className="customer-detail__summary-value">
                {daily
                  ? getStatusLabel(schedule.status)
                  : formatCurrency(totalAmount)}
              </strong>
            </div>
            <div className="customer-detail__summary-item">
              <span className="customer-detail__summary-label">
                <ClockCircleOutline fontSize={14} />
                {daily ? "待收款" : "当前阶段"}
              </span>
              <strong className="customer-detail__summary-value">
                {daily
                  ? formatCurrency(remainingAmount)
                  : stageDisplay[stage].shortLabel}
              </strong>
            </div>
          </div>

          {!daily && serviceSlots.length > 1 ? (
            <div className="customer-detail__date-list" aria-label="多场跟妆日期">
              {serviceSlots.map((slot, index) => (
                <span key={slot.id} className="customer-detail__date-chip">
                  <em>第{index + 1}场</em>
                  <strong>{formatCompactDate(slot.date)}</strong>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {!daily && (
          <section className="customer-detail__card">
            <div className="customer-detail__section-head">
              <div>
                <span className="customer-detail__section-kicker">
                  服务进度
                </span>
                <h2 className="customer-detail__section-title">当前进度</h2>
                <p className="customer-detail__section-desc">
                  {stageDisplay[stage].helper}
                </p>
              </div>
              <span className="customer-detail__section-meta customer-detail__section-meta--progress">
                {currentStageIndex + 1} / {stageFlow.length}
              </span>
            </div>

            <div className="mt-4 flex">
              {stageFlow.map((item, index) => {
                const done = index <= currentStageIndex;
                const isLast = index === stageFlow.length - 1;

                return (
                  <div
                    key={item}
                    className="flex min-w-0 flex-1 flex-col items-center"
                  >
                    <div className="flex w-full items-center">
                      <div
                        className={`h-0.5 flex-1 rounded-full ${
                          index === 0
                            ? "invisible"
                            : index <= currentStageIndex
                            ? "bg-(--app-primary)"
                            : "bg-(--app-border)"
                        }`}
                      />
                      <div
                        className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-solid text-[11px] ${
                          done
                            ? "border-(--app-primary) bg-(--app-primary) text-white"
                            : "border-(--app-border) bg-white text-(--app-muted)"
                        }`}
                      >
                        {done ? <CheckOutline fontSize={12} /> : index + 1}
                      </div>
                      <div
                        className={`h-0.5 flex-1 rounded-full ${
                          isLast
                            ? "invisible"
                            : index < currentStageIndex
                            ? "bg-(--app-primary)"
                            : "bg-(--app-border)"
                        }`}
                      />
                    </div>
                    <span
                      className={`customer-detail__step-label ${
                        done ? "is-done" : "is-pending"
                      }`}
                    >
                      {stageDisplay[item].label}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button
              block
              color="primary"
              className="customer-detail__action-btn mt-4!"
              disabled={!currentNextStage}
              onClick={advanceStage}
            >
              <span className="customer-detail__action-btn-content">
                {currentNextStage ? (
                  <>
                    推进到「{stageDisplay[currentNextStage].label}」
                    <RightOutline fontSize={14} />
                  </>
                ) : (
                  "流程已完成"
                )}
              </span>
            </Button>
          </section>
        )}

        <section className="customer-detail__schedule-panel">
          <div className="customer-detail__panel-head">
            <div>
              <span className="customer-detail__section-kicker">
                MAKEUP PLAN
              </span>
              <h2 className="customer-detail__subsection-title">服务安排</h2>
            </div>
            {daily ? (
              <span>
                {getStatusLabel(schedule.status)}
              </span>
            ) : (
              <div className="customer-detail__panel-summary">
                <span className="customer-detail__panel-summary-item">
                  <CalendarOutline fontSize={12} />
                  <strong>试妆</strong>
                  <em>{trialSlots.length}</em>
                </span>
                <span className="customer-detail__panel-summary-item is-follow">
                  <CalendarOutline fontSize={12} />
                  <strong>跟妆</strong>
                  <em>{serviceSlots.length}</em>
                </span>
              </div>
            )}
          </div>

          <div className="customer-detail__tile-grid">
            {daily ? (
              <>
                <DetailTile
                  icon={<CalendarOutline />}
                  label="预约时间"
                  value={formatCompactDate(schedule.date)}
                  helper={formatTimeRange(schedule)}
                />
                <DetailTile
                  icon={<CalendarOutline />}
                  label="档期状态"
                  value={getStatusLabel(schedule.status)}
                  helper="当前预约状态"
                />
              </>
            ) : (
              <>
                <DetailTile
                  icon={<CalendarOutline />}
                  label="试妆预约"
                  value={trialSlots.length ? formatCompactDate(trialSlots[0].date) : "未约定"}
                  helper={trialSlots.length ? formatTimeRange(trialSlots[0]) : "待安排"}
                />
                <DetailTile
                  icon={<CalendarOutline />}
                  label={serviceDayTitle}
                  value={formatCompactDate(primaryServiceSlot?.date ?? schedule.date)}
                  helper={formatTimeRange(primaryServiceSlot ?? schedule)}
                />
                {serviceSlots.length > 1 ? (
                  <div className="customer-detail__slot-list">
                    {serviceSlots.slice(1).map((slot, index) => (
                      <div key={slot.id} className="customer-detail__slot-item is-follow">
                        <div className="customer-detail__slot-item-head">
                          <span className="customer-detail__slot-item-icon">
                            <CalendarOutline fontSize={13} />
                          </span>
                          <div className="customer-detail__slot-item-title">
                            <span>{getScheduleSlotLabel(slot, schedule.serviceSubtype)}</span>
                            <strong>{formatCompactDate(slot.date)}</strong>
                          </div>
                        </div>
                        <div className="customer-detail__slot-item-meta">
                          <ClockCircleOutline fontSize={12} />
                          <em>{formatTimeRange(slot)}</em>
                        </div>
                        <div className="customer-detail__slot-item-tags">
                          <span>第{index + 2}场</span>
                          <span>多日期</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <DetailTile
                  icon={<ShopbagOutline />}
                  label="服装套数"
                  value={`${schedule.outfitCount ?? 0} 套`}
                  helper="含造型切换"
                />
                <DetailTile
                  icon={<StarOutline />}
                  label="饰品"
                  value={getJewelryNeedLabel(schedule.jewelryNeed)}
                  helper={schedule.jewelryItems || "未记录明细"}
                />
              </>
            )}
          </div>

          {schedule.location ? (
            <div className="customer-detail__location">
              <EnvironmentOutline />
              <span>{schedule.location}</span>
            </div>
          ) : null}
        </section>

        <section className="customer-detail__card">
          <div className="customer-detail__card-head">
            <div>
              <span className="customer-detail__section-kicker">沟通记录</span>
              <h2 className="customer-detail__section-title">
                <PictureOutline className="text-(--app-primary)" />
                需求备注
              </h2>
            </div>
            <button
              type="button"
              className="customer-detail__text-btn"
              onClick={editNote}
              aria-label="编辑需求备注"
            >
              <EditSOutline fontSize={14} />
              编辑
            </button>
          </div>
          <p className="customer-detail__body">
            {schedule.note || "还没有填写需求备注。"}
          </p>
        </section>

        <section className="customer-detail__images">
          <div className="customer-detail__section-intro">
            <div>
              <span className="customer-detail__section-kicker">视觉资料</span>
              <h2 className="customer-detail__subsection-title">
                需求参考图 · 试妆记录
              </h2>
            </div>
            <span className="customer-detail__section-count">
              {getReferenceImages(schedule, "makeup").length +
                getReferenceImages(schedule, "jewelry").length +
                getReferenceImages(schedule, "outfit").length +
                getReferenceImages(schedule, "trial").length}{" "}
              张
            </span>
          </div>
          {referenceImageGroups.map((group) => {
            const images = getReferenceImages(schedule, group.value);
            return (
              <div key={group.value} className="customer-detail__image-group">
                <div className="customer-detail__image-head">
                  <h3 className="customer-detail__image-title">
                    {group.title}
                  </h3>
                  <span className="customer-detail__image-hint">
                    {group.hint}
                  </span>
                </div>
                <ImageUploader
                  value={toUploadItems(images)}
                  upload={async (file) => {
                    try {
                      return {
                        key: crypto.randomUUID(),
                        url: await fileToDataUrl(file),
                        extra: {
                          id: crypto.randomUUID(),
                          group: group.value,
                          name: file.name,
                          createdAt: new Date().toISOString(),
                        },
                      };
                    } catch (error) {
                      Toast.show(
                        error instanceof Error ? error.message : "图片处理失败"
                      );
                      throw error;
                    }
                  }}
                  onChange={(items) => {
                    void handleImagesChange(group.value, items);
                  }}
                  accept="image/*"
                  multiple
                  maxCount={8}
                  columns={4}
                  imageFit="cover"
                  onCountExceed={() => Toast.show("每组最多 8 张")}
                />
              </div>
            );
          })}
        </section>

        <section className="customer-detail__card">
          <div className="customer-detail__money-head">
            <div>
              <span className="customer-detail__section-kicker">收款记录</span>
              <h2 className="customer-detail__section-title">账目</h2>
              <p className="customer-detail__section-desc">
                总价 {formatCurrency(totalAmount)} · 已收
                {formatCurrency(paidAmount)}
              </p>
            </div>
            <div className="text-right">
              <span className="customer-detail__money-label">待收尾款</span>
              <strong className="customer-detail__money-value">
                {formatCurrency(remainingAmount)}
              </strong>
            </div>
          </div>
          <ProgressBar
            percent={
              totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
            }
          />
          <div className="customer-detail__payment-list">
            {payments.map((payment) => (
              <div
                key={
                  payment.id ??
                  `${payment.type}-${payment.date}-${payment.amount}`
                }
                className={`customer-detail__payment-item${
                  payment.amount < 0 ? " is-negative" : ""
                }`}
              >
                <div className="customer-detail__payment-main">
                  <strong className="customer-detail__payment-label">
                    {payment.label}
                  </strong>
                  <span className="customer-detail__payment-date">
                    {payment.date}
                  </span>
                </div>
                <div className="customer-detail__payment-side">
                  <span className="customer-detail__payment-amount">
                    {formatSignedCurrency(payment.amount)}
                  </span>
                  <button
                    type="button"
                    className="customer-detail__payment-delete"
                    onClick={() => removePaymentRecord(payment.id)}
                    aria-label={`删除${payment.label}流水`}
                  >
                    <DeleteOutline fontSize={14} />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="customer-detail__money-actions">
            <Button
              block
              fill="outline"
              className="customer-detail__action-btn border-dashed! border-(--app-primary)! text-(--app-primary)!"
              onClick={() => openPaymentDialog("receive")}
            >
              <span className="customer-detail__action-btn-content">
                <PayCircleOutline fontSize={16} />
                添加收款
              </span>
            </Button>
            <Button
              block
              fill="outline"
              className="customer-detail__action-btn customer-detail__deduct-btn"
              onClick={() => openPaymentDialog("deduct")}
            >
              <span className="customer-detail__action-btn-content">
                <MinusCircleOutline fontSize={16} />
                记减/冲减
              </span>
            </Button>
          </div>
          <button
            type="button"
            className="customer-detail__delete-schedule"
            onClick={confirmDeleteSchedule}
          >
            <DeleteOutline fontSize={15} />
            删除档期
          </button>
        </section>
      </div>
    </div>
  );
};

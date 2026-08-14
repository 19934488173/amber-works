import { useState } from 'react'
import { DatePicker, Form, Input, NavBar, TextArea, Toast, Button } from 'antd-mobile'
import { CheckOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import {
  draftFromForm,
  getBrideStageValue,
  getJewelryNeedValue,
  getServiceCategoryValue,
  getServiceSubtypeValue,
  normalizeStage,
} from '../../app/bridalData'
import type { CustomerFormValues } from '../../app/bridalData'
import { useScheduleStore } from '../../app/useScheduleStore'
import {
  BridalAppointmentSchedule,
  DailyAppointmentSchedule,
} from '../../components/AppointmentSchedule/AppointmentSchedule'
import { BrideStagePicker } from '../../components/BrideStagePicker/BrideStagePicker'
import { JewelryNeedPicker, type JewelryChoice } from '../../components/JewelryNeedPicker/JewelryNeedPicker'
import { ScheduleStatusPicker } from '../../components/ScheduleStatusPicker/ScheduleStatusPicker'
import { ServiceTypePicker } from '../../components/ServiceTypePicker/ServiceTypePicker'
import type { BrideStage, BridalSubtype, ScheduleStatus, ServiceCategory, ServiceSubtype } from '../../types/schedule'
import { getDefaultServiceSubtype } from '../../types/schedule'
import { formatTimeString, parseTimeString } from '../../utils/date'

type Props = {
  initialValues?: CustomerFormValues
  title?: string
  submitText?: string
  onSubmit?: (values: CustomerFormValues) => Promise<void>
  onCancel?: () => void
}

type PaymentDateField = 'firstDepositDate' | 'trialDepositDate' | 'finalPaymentDate'

type DateField = 'trialDate' | 'date' | PaymentDateField

type TimeField = 'trialStartTime' | 'trialEndTime' | 'startTime' | 'endTime'

const getStatusValue = (status?: CustomerFormValues['status']): ScheduleStatus =>
  (Array.isArray(status) ? status[0] : status) ?? 'confirmed'

const paymentDateClass =
  'profile-form__date-button flex! items-center! justify-between! min-h-11! rounded-3! border-(--app-border)! bg-white! px-3! text-base! font-normal! leading-tight! text-(--app-text)!'

export const CustomerProfileForm = ({
  initialValues,
  title = '新建客户档案',
  submitText = '保存客户档案',
  onSubmit,
  onCancel,
}: Props) => {
  const navigate = useNavigate()
  const { createSchedule } = useScheduleStore()
  const [form] = Form.useForm<CustomerFormValues>()
  const initialCategory = getServiceCategoryValue(initialValues?.serviceCategory) ?? 'bridal'
  const initialJewelry = getJewelryNeedValue(initialValues?.jewelryNeed)
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(initialCategory)
  const [serviceSubtype, setServiceSubtype] = useState<ServiceSubtype>(
    getServiceSubtypeValue(initialValues?.serviceSubtype) ?? getDefaultServiceSubtype(initialCategory),
  )
  const [brideStage, setBrideStage] = useState<BrideStage>(
    normalizeStage(getBrideStageValue(initialValues?.brideStage)),
  )
  const [jewelryChoice, setJewelryChoice] = useState<JewelryChoice>(
    initialJewelry === 'none' ? 'none' : 'borrow',
  )
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>(
    getStatusValue(initialValues?.status),
  )
  const [datePickerField, setDatePickerField] = useState<DateField | null>(null)
  const [timePickerField, setTimePickerField] = useState<TimeField | null>(null)
  const jewelryItems = Form.useWatch('jewelryItems', form)
  const trialDate = Form.useWatch('trialDate', form)
  const trialStartTime = Form.useWatch('trialStartTime', form)
  const trialEndTime = Form.useWatch('trialEndTime', form)
  const serviceDate = Form.useWatch('date', form)
  const startTime = Form.useWatch('startTime', form)
  const endTime = Form.useWatch('endTime', form)

  const handleCategoryChange = (category: ServiceCategory) => {
    const subtype = getDefaultServiceSubtype(category)
    setServiceCategory(category)
    setServiceSubtype(subtype)
    form.setFieldsValue({
      serviceCategory: [category],
      serviceSubtype: [subtype],
    })
  }

  const handleSubtypeChange = (subtype: ServiceSubtype) => {
    setServiceSubtype(subtype)
    form.setFieldValue('serviceSubtype', [subtype])
  }

  const handleJewelryChange = (choice: JewelryChoice) => {
    setJewelryChoice(choice)
    if (choice === 'none') {
      form.setFieldValue('jewelryItems', undefined)
    }
  }

  const submit = async (values: CustomerFormValues) => {
    const payload: CustomerFormValues = {
      ...values,
      serviceCategory,
      serviceSubtype,
      brideStage,
      jewelryNeed: jewelryChoice,
      jewelryItems: jewelryChoice === 'none' ? undefined : values.jewelryItems,
      status: serviceCategory === 'daily' ? scheduleStatus : values.status,
    }

    if (!payload.customer?.trim()) {
      Toast.show('请填写客户姓名')
      return
    }

    if (serviceCategory === 'bridal' && !payload.date) {
      Toast.show('请选择跟妆档期日期')
      return
    }

    if (serviceCategory === 'daily' && !payload.date) {
      Toast.show('请选择预约日期')
      return
    }

    if (onSubmit) {
      await onSubmit(payload)
      return
    }

    const schedule = await createSchedule(draftFromForm(payload))
    Toast.show('已保存客户档案')
    navigate(`/customer/${schedule.id}`)
  }

  const datePickerValue = datePickerField ? form.getFieldValue(datePickerField) : undefined
  const timePickerValue = timePickerField ? form.getFieldValue(timePickerField) : undefined

  return (
    <div className="min-h-dvh bg-(--app-bg)">
      <NavBar className="border-b border-(--app-border) bg-white" onBack={onCancel ?? (() => navigate(-1))}>
        {title}
      </NavBar>

      <div className="profile-form px-4 pb-28 pt-5">
        <Form
          className="profile-form"
          form={form}
          layout="vertical"
          requiredMarkStyle="asterisk"
          onFinish={submit}
          initialValues={{
            outfitCount: '3',
            trialStartTime: '10:00',
            trialEndTime: '12:00',
            startTime: '06:00',
            endTime: '12:00',
            ...initialValues,
            serviceCategory: [initialCategory],
            serviceSubtype: [
              getServiceSubtypeValue(initialValues?.serviceSubtype)
                ?? getDefaultServiceSubtype(initialCategory),
            ],
            jewelryNeed: initialValues?.jewelryNeed
              ? [Array.isArray(initialValues.jewelryNeed) ? initialValues.jewelryNeed[0] : initialValues.jewelryNeed]
              : ['borrow'],
            brideStage: initialValues?.brideStage
              ? [Array.isArray(initialValues.brideStage) ? initialValues.brideStage[0] : initialValues.brideStage]
              : ['inquiry'],
            status: initialValues?.status
              ? [Array.isArray(initialValues.status) ? initialValues.status[0] : initialValues.status]
              : ['confirmed'],
          }}
          footer={null}
        >
          <Form.Item label="服务类型" required>
            <ServiceTypePicker
              category={serviceCategory}
              subtype={serviceSubtype}
              onCategoryChange={handleCategoryChange}
              onSubtypeChange={handleSubtypeChange}
            />
          </Form.Item>

          <Form.Item label="客户姓名" name="customer" rules={[{ required: true, message: '请输入客户姓名' }]}>
            <Input placeholder="如：林小婉" autoComplete="name" />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="手机号" type="tel" autoComplete="tel" />
          </Form.Item>

          {serviceCategory === 'bridal' ? (
            <>
              <Form.Item label="档期安排" required>
                <BridalAppointmentSchedule
                  subtype={serviceSubtype as BridalSubtype}
                  trial={{
                    date: trialDate,
                    startTime: trialStartTime,
                    endTime: trialEndTime,
                  }}
                  service={{
                    date: serviceDate,
                    startTime,
                    endTime,
                  }}
                  onPickTrialDate={() => setDatePickerField('trialDate')}
                  onPickServiceDate={() => setDatePickerField('date')}
                  onPickTrialStartTime={() => setTimePickerField('trialStartTime')}
                  onPickTrialEndTime={() => setTimePickerField('trialEndTime')}
                  onPickServiceStartTime={() => setTimePickerField('startTime')}
                  onPickServiceEndTime={() => setTimePickerField('endTime')}
                />
              </Form.Item>
              <Form.Item name="trialDate" hidden><Input /></Form.Item>
              <Form.Item name="date" hidden rules={[{ required: true, message: '请选择跟妆档期' }]}><Input /></Form.Item>
              <Form.Item name="trialStartTime" hidden><Input /></Form.Item>
              <Form.Item name="trialEndTime" hidden><Input /></Form.Item>
              <Form.Item name="startTime" hidden><Input /></Form.Item>
              <Form.Item name="endTime" hidden><Input /></Form.Item>
            </>
          ) : (
            <>
              <Form.Item label="服务预约" required>
                <DailyAppointmentSchedule
                  slot={{
                    date: serviceDate,
                    startTime,
                    endTime,
                  }}
                  onPickDate={() => setDatePickerField('date')}
                  onPickStartTime={() => setTimePickerField('startTime')}
                  onPickEndTime={() => setTimePickerField('endTime')}
                />
              </Form.Item>
              <Form.Item name="date" hidden rules={[{ required: true, message: '请选择预约日期' }]}><Input /></Form.Item>
              <Form.Item name="startTime" hidden><Input /></Form.Item>
              <Form.Item name="endTime" hidden><Input /></Form.Item>
            </>
          )}

          <Form.Item label="场地" name="location">
            <Input placeholder={serviceCategory === 'daily' ? '工作室 / 上门地址' : '酒店 / 宴会厅'} />
          </Form.Item>

          {serviceCategory === 'bridal' && (
            <Form.Item label="当前进度" required>
              <BrideStagePicker
                stage={brideStage}
                onChange={setBrideStage}
              />
            </Form.Item>
          )}

          {serviceCategory === 'daily' && (
            <Form.Item label="预约进度" required>
              <ScheduleStatusPicker
                status={scheduleStatus}
                onChange={setScheduleStatus}
              />
            </Form.Item>
          )}

          {serviceCategory === 'bridal' ? (
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="约定总价" name="amount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="服装套数" name="outfitCount">
                <Input placeholder="3" type="number" inputMode="numeric" />
              </Form.Item>
            </div>
          ) : (
            <Form.Item label="约定总价" name="amount">
              <Input placeholder="¥ 0" type="number" inputMode="decimal" />
            </Form.Item>
          )}

          {serviceCategory === 'bridal' && <div className="profile-form__section">
            <h2 className="profile-form__section-title">收款信息</h2>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="试妆定金" name="firstDepositAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="收款日期" name="firstDepositDate">
                <button type="button" className={paymentDateClass} onClick={() => setDatePickerField('firstDepositDate')}>
                  {form.getFieldValue('firstDepositDate') ? form.getFieldValue('firstDepositDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </button>
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="复定定金" name="trialDepositAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="复定日期" name="trialDepositDate">
                <button type="button" className={paymentDateClass} onClick={() => setDatePickerField('trialDepositDate')}>
                  {form.getFieldValue('trialDepositDate') ? form.getFieldValue('trialDepositDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </button>
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="已收尾款" name="finalPaymentAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="尾款日期" name="finalPaymentDate">
                <button type="button" className={paymentDateClass} onClick={() => setDatePickerField('finalPaymentDate')}>
                  {form.getFieldValue('finalPaymentDate') ? form.getFieldValue('finalPaymentDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </button>
              </Form.Item>
            </div>
          </div>}

          {serviceCategory === 'daily' && <div className="profile-form__section">
            <h2 className="profile-form__section-title">收款信息</h2>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="预约档期定金" name="firstDepositAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="收款日期" name="firstDepositDate">
                <button type="button" className={paymentDateClass} onClick={() => setDatePickerField('firstDepositDate')}>
                  {form.getFieldValue('firstDepositDate') ? form.getFieldValue('firstDepositDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </button>
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="已收尾款" name="finalPaymentAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="收款日期" name="finalPaymentDate">
                <button type="button" className={paymentDateClass} onClick={() => setDatePickerField('finalPaymentDate')}>
                  {form.getFieldValue('finalPaymentDate') ? form.getFieldValue('finalPaymentDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </button>
              </Form.Item>
            </div>
          </div>}

          {serviceCategory === 'bridal' && (
            <Form.Item label="饰品安排">
              <JewelryNeedPicker
                value={jewelryChoice}
                items={jewelryItems}
                onChange={handleJewelryChange}
                onItemsChange={(value) => form.setFieldValue('jewelryItems', value || undefined)}
              />
            </Form.Item>
          )}

          <Form.Item name="jewelryItems" hidden>
            <Input />
          </Form.Item>

          <Form.Item label="需求备注" name="note">
            <TextArea rows={3} placeholder={serviceCategory === 'daily' ? '妆容偏好、到店时间等' : '客人的喜好、忌讳、特殊要求等'} />
          </Form.Item>
        </Form>
      </div>

      <div className="profile-form__footer fixed inset-x-0 bottom-0 z-20 mx-auto max-w-107.5 border-t border-(--app-border) bg-white/95 px-4 py-3 safe-bottom">
        {onCancel && (
          <Button block fill="none" size="small" className="mb-1.5!" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button block color="primary" className="profile-form__submit" onClick={() => form.submit()}>
          <span className="profile-form__submit-content">
            <CheckOutline fontSize={16} />
            {submitText}
          </span>
        </Button>
      </div>

      <DatePicker
        visible={Boolean(datePickerField)}
        precision="day"
        value={datePickerValue}
        onClose={() => setDatePickerField(null)}
        onConfirm={(value) => {
          if (datePickerField) {
            form.setFieldValue(datePickerField, value)
          }
          setDatePickerField(null)
        }}
      />

      <DatePicker
        visible={Boolean(timePickerField)}
        precision="minute"
        value={parseTimeString(timePickerValue)}
        onClose={() => setTimePickerField(null)}
        onConfirm={(value: Date) => {
          if (timePickerField) {
            form.setFieldValue(timePickerField, formatTimeString(value))
          }
          setTimePickerField(null)
        }}
      />
    </div>
  )
}

export const ScheduleEditorPage = () => <CustomerProfileForm />

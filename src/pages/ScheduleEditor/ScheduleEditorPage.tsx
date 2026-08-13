import { useState } from 'react'
import { Button, DatePicker, Form, Input, NavBar, Selector, TextArea, Toast } from 'antd-mobile'
import { CheckOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { draftFromForm, getJewelryNeedValue, getServiceTypeValue, stageDisplay, stageFlow } from '../../app/bridalData'
import type { CustomerFormValues } from '../../app/bridalData'
import { useScheduleStore } from '../../app/useScheduleStore'
import { scheduleStatusOptions, scheduleTypeOptions } from '../../types/schedule'

type Props = {
  initialValues?: CustomerFormValues
  title?: string
  submitText?: string
  onSubmit?: (values: CustomerFormValues) => Promise<void>
  onCancel?: () => void
}

type DateField = 'date' | 'trialDate' | 'firstDepositDate' | 'trialDepositDate' | 'finalPaymentDate'

const dateFieldClass =
  'flex! items-center! justify-between! h-9! rounded-3! border-(--app-border)! bg-white/80! px-2.5! text-[13px]! font-normal! leading-none! text-(--app-text)!'

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
  const [serviceType, setServiceType] = useState<'bridal' | 'daily'>(getServiceTypeValue(initialValues?.serviceType) ?? 'bridal')
  const [datePickerField, setDatePickerField] = useState<DateField | null>(null)
  const jewelryNeed = Form.useWatch('jewelryNeed', form)
  const needsJewelry = (getJewelryNeedValue(jewelryNeed) ?? getJewelryNeedValue(initialValues?.jewelryNeed) ?? 'borrow') === 'borrow'

  const submit = async (values: CustomerFormValues) => {
    if (!values.customer?.trim()) {
      Toast.show('请填写客户姓名')
      return
    }

    if (onSubmit) {
      await onSubmit(values)
      return
    }

    const schedule = await createSchedule(draftFromForm(values))
    Toast.show('已保存客户档案')
    navigate(`/customer/${schedule.id}`)
  }

  const pickerValue = datePickerField ? form.getFieldValue(datePickerField) : undefined

  return (
    <div className="min-h-dvh bg-(--app-bg)">
      <NavBar className="border-b border-(--app-border) bg-white" onBack={onCancel ?? (() => navigate(-1))}>
        {title}
      </NavBar>

      <div className="profile-form px-4 pb-24 pt-4">
        <Form
          className="profile-form"
          form={form}
          layout="vertical"
          requiredMarkStyle="asterisk"
          onFinish={submit}
          initialValues={{
            outfitCount: '3',
            ...initialValues,
            serviceType: [getServiceTypeValue(initialValues?.serviceType) ?? 'bridal'],
            jewelryNeed: initialValues?.jewelryNeed
              ? [Array.isArray(initialValues.jewelryNeed) ? initialValues.jewelryNeed[0] : initialValues.jewelryNeed]
              : ['borrow'],
            brideStage: initialValues?.brideStage
              ? [Array.isArray(initialValues.brideStage) ? initialValues.brideStage[0] : initialValues.brideStage]
              : ['inquiry'],
            status: initialValues?.status
              ? [Array.isArray(initialValues.status) ? initialValues.status[0] : initialValues.status]
              : ['confirmed'],
            type: initialValues?.type
              ? [Array.isArray(initialValues.type) ? initialValues.type[0] : initialValues.type]
              : ['makeup'],
          }}
          footer={null}
        >
          <Form.Item label="客户类型" name="serviceType" rules={[{ required: true }]}>
            <Selector
              columns={2}
              options={[{ value: 'bridal', label: '婚礼跟妆' }, { value: 'daily', label: '生活妆' }]}
              onChange={(value) => setServiceType((value[0] as 'bridal' | 'daily') ?? 'bridal')}
            />
          </Form.Item>

          <Form.Item label="客户姓名" name="customer" rules={[{ required: true, message: '请输入客户姓名' }]}>
            <Input placeholder="如：林小婉" autoComplete="name" />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="手机号" type="tel" autoComplete="tel" />
          </Form.Item>

          <Form.Item label="服务类型" name="type" rules={[{ required: true }]}>
            <Selector
              columns={2}
              options={scheduleTypeOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </Form.Item>

          <div className={serviceType === 'bridal' ? 'grid grid-cols-2 gap-2.5' : ''}>
            <Form.Item label={serviceType === 'daily' ? '预约日期' : '婚期 / 跟妆日'} name="date" rules={[{ required: true, message: '请选择日期' }]}>
              <Button block fill="outline" className={dateFieldClass} onClick={() => setDatePickerField('date')}>
                {form.getFieldValue('date') ? form.getFieldValue('date').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
              </Button>
            </Form.Item>
            {serviceType === 'bridal' && <Form.Item label="试妆日" name="trialDate">
              <Button block fill="outline" className={dateFieldClass} onClick={() => setDatePickerField('trialDate')}>
                {form.getFieldValue('trialDate') ? form.getFieldValue('trialDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
              </Button>
            </Form.Item>}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Form.Item label="开始时间" name="startTime">
              <Input placeholder={serviceType === 'daily' ? '如 14:00' : '如 06:00'} type="time" />
            </Form.Item>
            <Form.Item label="结束时间" name="endTime">
              <Input placeholder="如 12:00" type="time" />
            </Form.Item>
          </div>

          <Form.Item label="场地" name="location">
            <Input placeholder="酒店 / 宴会厅" />
          </Form.Item>

          {serviceType === 'bridal' && (
            <Form.Item label="当前进度" name="brideStage" rules={[{ required: true, message: '请选择当前进度' }]}>
              <Selector
                columns={2}
                options={stageFlow.map((stage) => ({
                  value: stage,
                  label: stageDisplay[stage].label,
                }))}
              />
            </Form.Item>
          )}

          {serviceType === 'daily' && (
            <Form.Item label="档期状态" name="status" rules={[{ required: true }]}>
              <Selector
                columns={2}
                options={scheduleStatusOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
            </Form.Item>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Form.Item label="约定总价" name="amount">
              <Input placeholder="¥ 0" type="number" inputMode="decimal" />
            </Form.Item>
            {serviceType === 'bridal' && <Form.Item label="服装套数" name="outfitCount">
              <Input placeholder="3" type="number" inputMode="numeric" />
            </Form.Item>}
          </div>

          {serviceType === 'bridal' && <div className="profile-form__section">
            <h2 className="profile-form__section-title">收款信息</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Form.Item label="试妆定金" name="firstDepositAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="收款日期" name="firstDepositDate">
                <Button block fill="outline" className={dateFieldClass} onClick={() => setDatePickerField('firstDepositDate')}>
                  {form.getFieldValue('firstDepositDate') ? form.getFieldValue('firstDepositDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </Button>
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Form.Item label="复定定金" name="trialDepositAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="复定日期" name="trialDepositDate">
                <Button block fill="outline" className={dateFieldClass} onClick={() => setDatePickerField('trialDepositDate')}>
                  {form.getFieldValue('trialDepositDate') ? form.getFieldValue('trialDepositDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </Button>
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Form.Item label="已收尾款" name="finalPaymentAmount">
                <Input placeholder="¥ 0" type="number" inputMode="decimal" />
              </Form.Item>
              <Form.Item label="尾款日期" name="finalPaymentDate">
                <Button block fill="outline" className={dateFieldClass} onClick={() => setDatePickerField('finalPaymentDate')}>
                  {form.getFieldValue('finalPaymentDate') ? form.getFieldValue('finalPaymentDate').toLocaleDateString('zh-CN') : '年 / 月 / 日'}
                </Button>
              </Form.Item>
            </div>
          </div>}

          {serviceType === 'bridal' && <Form.Item label="是否需要饰品" name="jewelryNeed" className="profile-form__jewelry">
            <Selector
              columns={2}
              options={[
                { value: 'borrow', label: '需要' },
                { value: 'none', label: '不需要 / 自备' },
              ]}
              onChange={(value) => {
                if (value[0] === 'none') {
                  form.setFieldValue('jewelryItems', undefined)
                }
              }}
            />
          </Form.Item>}

          {serviceType === 'bridal' && needsJewelry && <Form.Item label="饰品说明" name="jewelryItems">
            <Input placeholder="如：长头纱 · 珍珠发饰 · 水滴耳环" />
          </Form.Item>}

          <Form.Item label="需求备注" name="note">
            <TextArea rows={3} placeholder={serviceType === 'daily' ? '妆容偏好、到店时间等' : '客人的喜好、忌讳、特殊要求等'} />
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
        value={pickerValue}
        onClose={() => setDatePickerField(null)}
        onConfirm={(value) => {
          if (datePickerField) {
            form.setFieldValue(datePickerField, value)
          }
          setDatePickerField(null)
        }}
      />
    </div>
  )
}

export const ScheduleEditorPage = () => <CustomerProfileForm />

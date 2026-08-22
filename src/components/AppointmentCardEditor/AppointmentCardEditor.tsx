import { Button, Form, Input } from "antd-mobile";
import type { Schedule } from "../../types/schedule";
import { getDefaultAppointmentCardDraft } from "../AppointmentReminderCard/appointmentCardTypes";
import type { AppointmentCardDraft } from "../AppointmentReminderCard/appointmentCardTypes";

type Props = {
  schedule: Schedule;
  onSubmit: (draft: AppointmentCardDraft) => Promise<void>;
};

export const AppointmentCardEditor = ({ schedule, onSubmit }: Props) => {
  const [form] = Form.useForm<AppointmentCardDraft>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={getDefaultAppointmentCardDraft(schedule)}
      onFinish={onSubmit}
      footer={
        <Button block color="primary" onClick={() => form.submit()}>
          生成 PNG 图片
        </Button>
      }
    >
      <Form.Item
        label="客户称呼"
        name="customerName"
        rules={[{ required: true, message: "请输入客户称呼" }]}
      >
        <Input placeholder="例如：林女士 / 小雅" />
      </Form.Item>
      <Form.Item label="服务项目" name="serviceLine">
        <Input placeholder="例如：新娘早妆 · Signature Look" />
      </Form.Item>
    </Form>
  );
};

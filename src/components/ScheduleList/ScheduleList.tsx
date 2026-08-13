import { Empty, Space } from 'antd-mobile'
import { ScheduleCard } from '../ScheduleCard/ScheduleCard'
import type { Schedule } from '../../types/schedule'

type Props = {
  schedules: Schedule[]
  emptyText?: string
  onComplete?: (schedule: Schedule) => void
  onDelete?: (schedule: Schedule) => void
  onDuplicate?: (schedule: Schedule) => void
}

export const ScheduleList = ({
  schedules,
  emptyText = '这一天还没有档期',
  onComplete,
  onDelete,
  onDuplicate,
}: Props) => {
  if (schedules.length === 0) {
    return <Empty description={emptyText} />
  }

  return (
    <Space direction="vertical" block className="schedule-list">
      {schedules.map((schedule) => (
        <ScheduleCard
          key={schedule.id}
          schedule={schedule}
          onComplete={onComplete}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </Space>
  )
}

import type { ScheduleStatus } from '../../types/schedule'
import { scheduleStatusOptions } from '../../types/schedule'

type Props = {
  status: ScheduleStatus
  onChange: (status: ScheduleStatus) => void
}

const statusHints: Record<ScheduleStatus, string> = {
  pending: '客人已咨询，待确认是否预约',
  confirmed: '已收预约定金，档期已锁定',
  in_progress: '服务当天或正在进行中',
  completed: '本次服务已完成',
  cancelled: '客人取消，档期释放',
}

const mainStatuses: ScheduleStatus[] = ['pending', 'confirmed', 'in_progress', 'completed']

export const ScheduleStatusPicker = ({ status, onChange }: Props) => {
  const current = scheduleStatusOptions.find((option) => option.value === status)

  return (
    <div className="status-picker">
      <div className="status-picker__intro">
        <strong>档期状态</strong>
        <span>记录当前预约进度</span>
      </div>

      <div className="status-picker__options" role="listbox" aria-label="档期状态">
        {mainStatuses.map((value) => {
          const option = scheduleStatusOptions.find((item) => item.value === value)
          if (!option) return null
          const active = status === value

          return (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={active}
              className={`status-picker__option${active ? ' is-active' : ''}`}
              onClick={() => onChange(value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={`status-picker__cancel${status === 'cancelled' ? ' is-active' : ''}`}
        onClick={() => onChange('cancelled')}
      >
        已取消
      </button>

      <div className="status-picker__summary">
        <strong>{current?.label ?? '待确认'}</strong>
        <p>{statusHints[status]}</p>
      </div>
    </div>
  )
}

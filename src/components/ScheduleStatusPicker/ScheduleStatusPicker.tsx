import type { ScheduleStatus } from '../../types/schedule'

type Props = {
  status: ScheduleStatus
  onChange: (status: ScheduleStatus) => void
}

const dailyStatuses: Array<{ value: ScheduleStatus; label: string; hint: string }> = [
  { value: 'confirmed', label: '已预约', hint: '已收预约定金，档期已锁定' },
  { value: 'completed', label: '已完成', hint: '本次服务已完成' },
]

const normalizeDaily = (status: ScheduleStatus): ScheduleStatus =>
  status === 'completed' || status === 'cancelled' ? status : 'confirmed'

export const ScheduleStatusPicker = ({ status, onChange }: Props) => {
  const current = normalizeDaily(status)
  const currentMeta = dailyStatuses.find((option) => option.value === current)

  return (
    <div className="status-picker">
      <div className="status-picker__intro">
        <strong>档期状态</strong>
        <span>生活妆仅预约与完成两个状态</span>
      </div>

      <div className="status-picker__options" role="listbox" aria-label="档期状态">
        {dailyStatuses.map((option) => {
          const active = current === option.value

          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              className={`status-picker__option${active ? ' is-active' : ''}`}
              onClick={() => onChange(option.value)}
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
        <strong>{status === 'cancelled' ? '已取消' : currentMeta?.label ?? '已预约'}</strong>
        <p>{status === 'cancelled' ? '客人取消，档期释放' : currentMeta?.hint ?? ''}</p>
      </div>
    </div>
  )
}

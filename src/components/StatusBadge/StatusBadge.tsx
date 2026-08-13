import { Tag } from 'antd-mobile'
import type { BrideStage, ScheduleStatus } from '../../types/schedule'
import { getBrideStageLabel, getBrideStageTone, getStatusLabel, getStatusTone } from '../../types/schedule'

export const StatusBadge = ({ status }: { status: ScheduleStatus }) => (
  <Tag color={getStatusTone(status)} round>
    {getStatusLabel(status)}
  </Tag>
)

export const BrideStageBadge = ({ stage }: { stage: BrideStage }) => (
  <Tag color={getBrideStageTone(stage)} round>
    {getBrideStageLabel(stage)}
  </Tag>
)

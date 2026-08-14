import { Tag } from 'antd-mobile'
import type { BrideStage } from '../../types/schedule'
import { getBrideStageLabel, getBrideStageTone } from '../../types/schedule'

export const BrideStageBadge = ({ stage }: { stage: BrideStage }) => (
  <Tag color={getBrideStageTone(stage)} round>
    {getBrideStageLabel(stage)}
  </Tag>
)

import { CheckOutline } from 'antd-mobile-icons'
import type { BrideStage } from '../../types/schedule'
import { stageDisplay, stageFlow } from '../../app/bridalData'

type Props = {
  stage: BrideStage
  onChange: (stage: BrideStage) => void
}

export const BrideStagePicker = ({ stage, onChange }: Props) => {
  const currentIndex = Math.max(stageFlow.indexOf(stage), 0)

  return (
    <div className="stage-picker">
      <div className="stage-picker__track" role="listbox" aria-label="当前进度">
        {stageFlow.map((item, index) => {
          const reached = index <= currentIndex
          const active = item === stage
          const isLast = index === stageFlow.length - 1

          return (
            <div key={item} className="stage-picker__step">
              <div className="stage-picker__rail">
                <span
                  className={`stage-picker__line${index === 0 ? ' is-hidden' : ''}${
                    index <= currentIndex ? ' is-reached' : ''
                  }`}
                />
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`stage-picker__dot${reached ? ' is-reached' : ''}${active ? ' is-active' : ''}`}
                  onClick={() => onChange(item)}
                >
                  {reached && !active ? <CheckOutline fontSize={11} /> : index + 1}
                </button>
                <span
                  className={`stage-picker__line${isLast ? ' is-hidden' : ''}${
                    index < currentIndex ? ' is-reached' : ''
                  }`}
                />
              </div>
              <button
                type="button"
                className={`stage-picker__label${active ? ' is-active' : ''}${reached ? ' is-reached' : ''}`}
                onClick={() => onChange(item)}
              >
                {stageDisplay[item].shortLabel}
              </button>
            </div>
          )
        })}
      </div>

      <div className="stage-picker__summary">
        <strong>{stageDisplay[stage].label}</strong>
        <p>{stageDisplay[stage].helper}</p>
      </div>
    </div>
  )
}

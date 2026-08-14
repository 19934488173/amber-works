import { Input } from 'antd-mobile'

export type JewelryChoice = 'borrow' | 'none'

type Props = {
  value: JewelryChoice
  items?: string
  onChange: (value: JewelryChoice) => void
  onItemsChange: (items: string) => void
}

const jewelryOptions: Array<{ value: JewelryChoice; title: string; desc: string }> = [
  { value: 'borrow', title: '需要饰品', desc: '工作室提供头饰 · 耳饰 · 发饰' },
  { value: 'none', title: '不需要', desc: '客人自备或不使用饰品' },
]

export const JewelryNeedPicker = ({ value, items, onChange, onItemsChange }: Props) => (
  <div className="jewelry-picker">
    <div className="jewelry-picker__options">
      {jewelryOptions.map((option) => {
        const active = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            className={`jewelry-picker__option${active ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <strong>{option.title}</strong>
            <span>{option.desc}</span>
          </button>
        )
      })}
    </div>

    {value === 'borrow' && (
      <div className="jewelry-picker__detail">
        <label className="jewelry-picker__detail-label" htmlFor="jewelry-items-input">
          饰品说明
        </label>
        <Input
          id="jewelry-items-input"
          placeholder="如：长头纱 · 珍珠发饰 · 水滴耳环"
          value={items ?? ''}
          onChange={onItemsChange}
        />
      </div>
    )}
  </div>
)

import type { ServiceCategory, ServiceSubtype } from '../../types/schedule'
import {
  getServiceSubtypeLabel,
  getServiceSubtypeOptions,
} from '../../types/schedule'

type Props = {
  category: ServiceCategory
  subtype: ServiceSubtype
  onCategoryChange: (category: ServiceCategory) => void
  onSubtypeChange: (subtype: ServiceSubtype) => void
}

const categoryMeta: Record<ServiceCategory, { title: string; desc: string }> = {
  bridal: { title: '跟妆', desc: '宴会跟妆 · 新娘早妆' },
  daily: { title: '日常生活妆', desc: '上镜 · 欧美 · 私教' },
}

export const ServiceTypePicker = ({
  category,
  subtype,
  onCategoryChange,
  onSubtypeChange,
}: Props) => {
  const subtypeOptions = getServiceSubtypeOptions(category)

  return (
    <div className="service-type-picker">
      <div className="service-type-picker__categories">
        {(['bridal', 'daily'] as const).map((key) => {
          const active = category === key
          const meta = categoryMeta[key]

          return (
            <button
              key={key}
              type="button"
              className={`service-type-picker__category${active ? ' is-active' : ''}`}
              onClick={() => onCategoryChange(key)}
            >
              <strong>{meta.title}</strong>
              <span>{meta.desc}</span>
            </button>
          )
        })}
      </div>

      <div className="service-type-picker__subtypes" role="listbox" aria-label="具体服务类型">
        {subtypeOptions.map((option) => {
          const active = subtype === option.value

          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              className={`service-type-picker__subtype${active ? ' is-active' : ''}`}
              onClick={() => onSubtypeChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <p className="service-type-picker__hint">
        已选
        <strong>
          {categoryMeta[category].title} · {getServiceSubtypeLabel(subtype)}
        </strong>
      </p>
    </div>
  )
}

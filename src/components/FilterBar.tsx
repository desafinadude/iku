import { activeFilterCount } from '../lib'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Filters, Item, ItemType } from '../types'
import { Icon } from './Icon'

interface Props {
  filters: Filters
  items: Item[]
  topTags: string[]
  onChange: (f: Filters) => void
  onMore: () => void
}

export function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function FilterBar({ filters, items, topTags, onChange, onMore }: Props) {
  const { types, tagStyle } = useLabels()
  const count = (t: ItemType) => items.filter((x) => x.type === t).length
  const active = activeFilterCount(filters)
  return (
    <div className="filter-bar">
      <label className="search">
        <Icon name="search" size={16} />
        <span className="sr-only">Search trip</span>
        <input
          type="search"
          placeholder="Search places, notes, links"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>
      <div className="chip-scroll">
        {types.map((s) => s.name).filter((t) => count(t) > 0).map((t) => {
          const on = filters.types.includes(t)
          return (
            <button key={t} className={`chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}>
              <span className="chip-icon" style={{ color: types.find((s) => s.name === t)!.color }}>
                <LabelIconView name={types.find((s) => s.name === t)!.icon} size={15} />
              </span>
              {t}
              <span className="chip-count">{count(t)}</span>
            </button>
          )
        })}
        <span className="divider" aria-hidden="true" />
        {topTags.map((tag) => {
          const on = filters.tags.includes(tag)
          const st = tagStyle(tag)
          return (
            <button
              key={tag}
              className={`chip chip-tag${on ? ' is-on-dark' : ''}${st.color ? ' chip-solid' : ''}`}
              style={st.color ? { background: st.color, borderColor: st.color } : undefined}
              aria-pressed={on}
              onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}
            >
              {on && st.color && <Icon name="check" size={14} strokeWidth={2.6} />}
              {st.icon && <LabelIconView name={st.icon} size={15} />}
              {tag}
            </button>
          )
        })}
        <button className="chip chip-more" onClick={onMore}>
          <Icon name="filter" size={14} /> {active ? `Filters (${active})` : 'More filters'}
        </button>
      </div>
    </div>
  )
}

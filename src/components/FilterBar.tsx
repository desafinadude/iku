import { activeFilterCount } from '../lib'
import { onColor } from '../colors'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Filters, Item } from '../types'
import { Icon } from './Icon'

interface Props {
  filters: Filters
  items: Item[]
  onChange: (f: Filters) => void
  onMore: () => void
}

export function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function FilterBar({ filters, items, onChange, onMore }: Props) {
  const { tagStyle, tags } = useLabels()
  const count = (t: string) => items.filter((x) => x.tags.includes(t)).length
  const active = activeFilterCount(filters)
  // Coloured tags first, then the most used; selected ones always stay visible.
  const topTags = tags.map((t) => t.name).filter((t) => count(t) > 0 || filters.tags.includes(t)).slice(0, 12)
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
        {topTags.map((tag) => {
          const on = filters.tags.includes(tag)
          const st = tagStyle(tag)
          return (
            <button
              key={tag}
              className={`chip chip-tag${on ? ' is-on-dark' : ''}${st.color ? ' chip-solid' : ''}`}
              style={st.color ? { background: st.color, borderColor: st.color, color: onColor(st.color) } : undefined}
              aria-pressed={on}
              onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}
            >
              {on && st.color && <Icon name="check" size={14} strokeWidth={2.6} />}
              {st.icon && <LabelIconView name={st.icon} size={15} />}
              {tag}
              <span className="chip-count">{count(tag)}</span>
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

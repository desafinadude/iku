import { activeFilterCount } from '../lib'
import { ITEM_TYPES, TYPE_COLORS, type Filters, type Item, type ItemType } from '../types'
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
        {ITEM_TYPES.filter((t) => count(t) > 0).map((t) => {
          const on = filters.types.includes(t)
          return (
            <button key={t} className={`chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}>
              <span className="dot" style={{ background: TYPE_COLORS[t].fg }} />
              {t}
              <span className="chip-count">{count(t)}</span>
            </button>
          )
        })}
        <span className="divider" aria-hidden="true" />
        {topTags.map((tag) => {
          const on = filters.tags.includes(tag)
          return (
            <button key={tag} className={`chip chip-tag${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}>
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

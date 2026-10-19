import { EMPTY_FILTERS, ITEM_TYPES, TYPE_COLORS, statusOf, type Filters, type Item, type Status } from '../types'
import { matches } from '../lib'
import { toggle } from './FilterBar'
import { Sheet } from './Sheet'

interface Props {
  filters: Filters
  items: Item[]
  allTags: string[]
  onChange: (f: Filters) => void
  onClose: () => void
}

const STATUSES: { id: Status; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'planned', label: 'Planned' },
  { id: 'booked', label: 'Booked' }
]

export function FilterSheet({ filters, items, allTags, onChange, onClose }: Props) {
  const shown = items.filter((x) => matches(x, filters)).length
  return (
    <Sheet
      title="Filter"
      onClose={onClose}
      headerAction={
        <button className="text-btn" onClick={() => onChange(EMPTY_FILTERS)}>
          Reset
        </button>
      }
      footer={
        <button className="primary-btn wide" onClick={onClose}>
          Show {shown} {shown === 1 ? 'item' : 'items'}
        </button>
      }
    >
      <fieldset className="group">
        <legend>Status</legend>
        <div className="chip-wrap">
          {STATUSES.map((s) => {
            const on = filters.statuses.includes(s.id)
            return (
              <button key={s.id} className={`chip${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, s.id) })}>
                {s.label} <span className="chip-count">{items.filter((x) => statusOf(x) === s.id).length}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>Type</legend>
        <div className="chip-wrap">
          {ITEM_TYPES.map((t) => {
            const on = filters.types.includes(t)
            return (
              <button key={t} className={`chip${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}>
                <span className="dot" style={{ background: TYPE_COLORS[t].fg }} />
                {t} <span className="chip-count">{items.filter((x) => x.type === t).length}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>Tags</legend>
        <div className="chip-wrap">
          {allTags.map((tag) => {
            const on = filters.tags.includes(tag)
            return (
              <button key={tag} className={`chip${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}>
                {tag} <span className="chip-count">{items.filter((x) => x.tags.includes(tag)).length}</span>
              </button>
            )
          })}
          {allTags.length === 0 && <span className="muted">No tags yet.</span>}
        </div>
      </fieldset>
      <label className="switch-row">
        <span>
          <b>Match all tags</b>
          <span className="muted small">Off: show items with any selected tag</span>
        </span>
        <input type="checkbox" checked={filters.matchAllTags} onChange={(e) => onChange({ ...filters, matchAllTags: e.target.checked })} />
      </label>
    </Sheet>
  )
}

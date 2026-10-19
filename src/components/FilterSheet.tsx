import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import { EMPTY_FILTERS, statusOf, type Filters, type Item, type Member, type Status } from '../types'
import { displayName, matches } from '../lib'
import { Avatar } from './Avatar'
import { toggle } from './FilterBar'
import { Sheet } from './Sheet'

interface Props {
  filters: Filters
  items: Item[]
  allTags: string[]
  members: Member[]
  onManage: () => void
  onChange: (f: Filters) => void
  onClose: () => void
}

const STATUSES: { id: Status; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'planned', label: 'Planned' },
  { id: 'booked', label: 'Booked' }
]

export function FilterSheet({ filters, items, allTags, members, onManage, onChange, onClose }: Props) {
  const { types, tagStyle } = useLabels()
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
      {members.length > 1 && (
        <fieldset className="group">
          <legend>Added by</legend>
          <div className="chip-wrap">
            {members.map((m) => {
              const on = filters.people.includes(m.email)
              return (
                <button key={m.email} className={`chip chip-person${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, people: toggle(filters.people, m.email) })}>
                  <Avatar member={m} size={24} />
                  {displayName(m)} <span className="chip-count">{items.filter((x) => x.createdBy === m.email).length}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
      <fieldset className="group">
        <legend>Type</legend>
        <div className="chip-wrap">
          {types.map((s) => s.name).map((t) => {
            const on = filters.types.includes(t)
            return (
              <button key={t} className={`chip${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}>
                <span className="chip-icon" style={{ color: on ? undefined : types.find((s) => s.name === t)!.color }}>
                  <LabelIconView name={types.find((s) => s.name === t)!.icon} size={15} />
                </span>
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
            const st = tagStyle(tag)
            return (
              <button key={tag} className={`chip${on ? ' is-on-dark' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}>
                {st.icon && (
                  <span className="chip-icon" style={{ color: on ? undefined : (st.color ?? undefined) }}>
                    <LabelIconView name={st.icon} size={14} />
                  </span>
                )}
                {!st.icon && st.color && <span className="dot" style={{ background: st.color }} />}
                {tag} <span className="chip-count">{items.filter((x) => x.tags.includes(tag)).length}</span>
              </button>
            )
          })}
          {allTags.length === 0 && <span className="muted">No tags yet.</span>}
        </div>
      </fieldset>
      <button type="button" className="secondary-btn manage-btn" onClick={onManage}>
        Manage types &amp; tags: colours, icons, names
      </button>
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

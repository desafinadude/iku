import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Prefs } from '../usePrefs'
import { EMPTY_FILTERS, statusOf, type Filters, type Item, type Member, type Status } from '../types'
import { displayName, matches } from '../lib'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { toggle } from './FilterBar'
import { Sheet } from './Sheet'

interface Props {
  filters: Filters
  items: Item[]
  allTags: string[]
  members: Member[]
  onManage: () => void
  prefs: Prefs
  onPrefs: (patch: Partial<Prefs>) => void
  onChange: (f: Filters) => void
  onClose: () => void
}

const STATUSES: { id: Status; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'planned', label: 'Planned' },
  { id: 'booked', label: 'Booked' }
]

export function FilterSheet({ filters, items, allTags, members, onManage, prefs, onPrefs, onChange, onClose }: Props) {
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
              <button
                key={tag}
                className={`chip${on ? ' is-on-dark' : ''}${st.color ? ' chip-solid' : ''}`}
                style={st.color ? { background: st.color, borderColor: st.color } : undefined}
                aria-pressed={on}
                onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}
              >
                {on && st.color && <Icon name="check" size={14} strokeWidth={2.6} />}
                {st.icon && <LabelIconView name={st.icon} size={15} />}
                {tag} <span className="chip-count">{items.filter((x) => x.tags.includes(tag)).length}</span>
              </button>
            )
          })}
          {allTags.length === 0 && <span className="muted">No tags yet.</span>}
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>Display</legend>
        <label className="switch-row">
          <span>
            <b>Hide repeats on later days</b>
            <span className="muted small">Show a multi-day entry (like a hotel) only on its first day</span>
          </span>
          <input type="checkbox" checked={prefs.hideRepeats} onChange={(e) => onPrefs({ hideRepeats: e.target.checked })} />
        </label>
        <label className="switch-row" style={{ marginTop: 8 }}>
          <span>
            <b>Show tags on repeats</b>
            <span className="muted small">Keep all tags visible on every day of a multi-day entry</span>
          </span>
          <input type="checkbox" checked={prefs.tagsOnRepeats} disabled={prefs.hideRepeats} onChange={(e) => onPrefs({ tagsOnRepeats: e.target.checked })} />
        </label>
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

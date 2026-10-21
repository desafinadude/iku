import { useState } from 'react'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import { dayLabel, displayTitle } from '../lib'
import type { Item } from '../types'
import { CardImage } from './CardImage'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

/** A button that opens the phone's own day list: puts an entry on a day, moves it, or sends it back to the ideas. */
export function DaySelect({ item, days, onMove }: { item: Item; days: string[]; onMove: (day: string | null) => void }) {
  const { dayStyle } = useLabels()
  const l = item.day ? dayLabel(item.day) : null
  return (
    <label className={`secondary-btn day-select${item.day ? ' is-set' : ''}`}>
      <Icon name="days" size={16} />
      <span>{l ? `${l.dow} ${l.num} ${l.month}` : 'Add to a day'}</span>
      <select
        aria-label={item.day ? 'Move to another day, or back to the ideas' : 'Add to a day'}
        value={item.day ?? ''}
        onChange={(e) => onMove(e.target.value || null)}
      >
        <option value="">{item.day ? 'Back to ideas (no day)' : 'Choose a day…'}</option>
        {days.map((d, i) => {
          const dl = dayLabel(d)
          const title = dayStyle(d).title ?? dayStyle(d).tag
          return (
            <option key={d} value={d}>
              Day {i + 1} · {dl.dow} {dl.num} {dl.month}
              {title ? ` · ${title}` : ''}
            </option>
          )
        })}
      </select>
    </label>
  )
}

/** Phone: pick ideas to add to a day. Each tap adds one; the list stays open for more. */
export function IdeaPicker({ day, ideas, onAdd, onClose }: { day: string; ideas: Item[]; onAdd: (id: string) => void; onClose: () => void }) {
  const { itemStyle } = useLabels()
  const [q, setQ] = useState('')
  const [added, setAdded] = useState<string[]>([])
  const l = dayLabel(day)
  const list = ideas.filter((x) => !added.includes(x.id) && (!q.trim() || `${x.title} ${x.tags.join(' ')} ${x.note ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())))
  return (
    <Sheet
      title={`Add to ${l.dow} ${l.num} ${l.month}`}
      onClose={onClose}
      footer={
        <button className="primary-btn wide" onClick={onClose}>
          {added.length ? `Done · ${added.length} added` : 'Done'}
        </button>
      }
    >
      <input className="picker-search" type="search" placeholder="Find an idea" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an idea" />
      <ul className="idea-pick-list">
        {list.map((x) => {
          const s = itemStyle(x)
          return (
            <li key={x.id}>
              <button
                type="button"
                className="idea-pick"
                onClick={() => {
                  onAdd(x.id)
                  setAdded((a) => [...a, x.id])
                }}
              >
                {x.imageUrl ? (
                  <CardImage className="idea-pick-thumb" imageUrl={x.imageUrl} />
                ) : (
                  <span className="idea-pick-thumb" style={{ background: s.color, color: s.fg }}>
                    <LabelIconView name={s.icon} size={20} />
                  </span>
                )}
                <span className="idea-pick-text">
                  <b>{displayTitle(x)}</b>
                  {x.tags.length > 0 && <span className="muted small">{x.tags.join(' · ')}</span>}
                </span>
                <span className="idea-pick-add" aria-hidden="true">
                  <Icon name="plus" size={18} />
                </span>
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="muted small">{ideas.length ? 'No more ideas match.' : 'No ideas yet.'}</li>}
      </ul>
    </Sheet>
  )
}

import { useState } from 'react'
import { dayLabel, displayName, domainOf, normalizeTag, shortDate } from '../lib'
import { ITEM_TYPES, TYPE_COLORS, type Item, type Member } from '../types'
import { Avatar, memberFor } from './Avatar'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

interface Props {
  item: Item
  isNew: boolean
  days: string[]
  allTags: string[]
  members: Member[]
  onSave: (item: Item) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ItemSheet({ item, isNew, days, allTags, members, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState(item)
  const [tagText, setTagText] = useState('')
  const [geoState, setGeoState] = useState<'idle' | 'busy' | 'none'>('idle')
  const set = (patch: Partial<Item>) => setDraft((d) => ({ ...d, ...patch }))

  const addTag = (raw: string) => {
    const t = normalizeTag(raw)
    if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] })
    setTagText('')
  }

  const findPlace = async () => {
    const q = draft.place || draft.title
    if (!q) return
    setGeoState('busy')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)
      const hits = (await res.json()) as { lat: string; lon: string; display_name: string }[]
      if (!hits.length) return setGeoState('none')
      set({ lat: Number(hits[0].lat), lng: Number(hits[0].lon), place: draft.place || hits[0].display_name.split(',').slice(0, 2).join(',') })
      setGeoState('idle')
    } catch {
      setGeoState('none')
    }
  }

  const suggestions = allTags.filter((t) => !draft.tags.includes(t) && t.includes(normalizeTag(tagText).slice(1))).slice(0, 5)
  const domain = domainOf(draft.url)
  const creator = memberFor(members, item.createdBy)
  const editor = item.updatedBy && item.updatedBy !== item.createdBy ? memberFor(members, item.updatedBy) : null

  return (
    <Sheet
      title={isNew ? 'New idea' : 'Edit'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button
              className="icon-btn danger"
              aria-label="Delete"
              onClick={() => {
                if (confirm(`Delete “${draft.title}”?`)) onDelete(draft.id)
              }}
            >
              <Icon name="trash" />
            </button>
          )}
          <button className="primary-btn wide" disabled={!draft.title.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim() })}>
            {draft.day ? 'Save to ' + dayLabel(draft.day).dow + ' ' + dayLabel(draft.day).num : 'Save to Ideas'}
          </button>
        </>
      }
    >
      {!isNew && creator && (
        <div className="byline">
          <Avatar member={creator} size={28} />
          <span>
            Added by <b>{displayName(creator)}</b> · {shortDate(item.createdAt)}
            {editor && item.updatedAt && (
              <span className="muted">
                {' '}
                · edited by {displayName(editor)} {shortDate(item.updatedAt)}
              </span>
            )}
          </span>
        </div>
      )}
      {domain && (
        <a className="link-preview" href={draft.url!} target="_blank" rel="noreferrer">
          <Icon name="link" size={16} /> <span>{domain}</span> <span className="muted small">open</span>
        </a>
      )}
      <div className="field">
        <label htmlFor="f-title">Title</label>
        <input id="f-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} autoFocus={isNew} />
      </div>
      <div className="field">
        <label htmlFor="f-url">Link</label>
        <input id="f-url" type="url" placeholder="https://" value={draft.url ?? ''} onChange={(e) => set({ url: e.target.value || null })} />
      </div>

      <fieldset className="group">
        <legend>Type</legend>
        <div className="chip-wrap">
          {ITEM_TYPES.map((t) => {
            const on = draft.type === t
            return (
              <button key={t} type="button" className={`chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => set({ type: t })}>
                <span className="dot" style={{ background: TYPE_COLORS[t].fg }} />
                {t}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="f-tags">Tags</label>
        <div className="tag-input">
          {draft.tags.map((t) => (
            <button key={t} type="button" className="tag-chip" aria-label={`Remove ${t}`} onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })}>
              {t} ×
            </button>
          ))}
          <input
            id="f-tags"
            placeholder="Add tag"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagText)
              }
            }}
            onBlur={() => tagText && addTag(tagText)}
          />
        </div>
        {suggestions.length > 0 && (
          <div className="chip-wrap">
            {suggestions.map((t) => (
              <button key={t} type="button" className="suggest" onClick={() => addTag(t)}>
                + {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="group">
        <legend>When</legend>
        <div className="when-strip">
          <button type="button" className={`when-pill${!draft.day ? ' is-on' : ''}`} aria-pressed={!draft.day} onClick={() => set({ day: null })}>
            <span className="small">Later</span>
            <b>Ideas</b>
          </button>
          {days.map((d) => {
            const l = dayLabel(d)
            const on = draft.day === d
            return (
              <button key={d} type="button" className={`when-pill${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => set({ day: d })}>
                <span className="small">{l.dow}</span>
                <b>{l.num}</b>
              </button>
            )
          })}
        </div>
      </fieldset>

      {draft.day && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-time">Time</label>
            <input id="f-time" type="time" value={draft.time ?? ''} onChange={(e) => set({ time: e.target.value || null })} />
          </div>
          <label className="check">
            <input type="checkbox" checked={draft.booked} onChange={(e) => set({ booked: e.target.checked })} /> Booked
          </label>
        </div>
      )}
      {draft.booked && (
        <div className="field">
          <label htmlFor="f-ref">Booking reference</label>
          <input id="f-ref" value={draft.bookingRef ?? ''} onChange={(e) => set({ bookingRef: e.target.value || null })} />
        </div>
      )}

      <div className="field">
        <label htmlFor="f-place">Place</label>
        <div className="input-with-btn">
          <input id="f-place" placeholder="Address or place name" value={draft.place ?? ''} onChange={(e) => set({ place: e.target.value || null })} />
          <button type="button" className="secondary-btn" onClick={findPlace} disabled={geoState === 'busy'}>
            <Icon name="pin" size={16} /> {geoState === 'busy' ? 'Finding…' : 'Find'}
          </button>
        </div>
        <span className="muted small">
          {geoState === 'none' ? 'Couldn’t find that place. Try a fuller address.' : draft.lat != null ? `On the map (${draft.lat.toFixed(4)}, ${draft.lng?.toFixed(4)})` : 'Not on the map yet'}
        </span>
      </div>

      <div className="field">
        <label htmlFor="f-note">Notes</label>
        <textarea id="f-note" rows={3} value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value || null })} />
      </div>
    </Sheet>
  )
}

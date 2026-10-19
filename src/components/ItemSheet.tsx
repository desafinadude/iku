import { useEffect, useRef, useState } from 'react'
import type { LinkPreview } from '../data/backend'
import { dayLabel, displayName, domainOf, isUrl, normalizeTag, quickPreview, shortDate } from '../lib'
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
  onUnfurl: (url: string) => Promise<LinkPreview | null>
  onSave: (item: Item) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ItemSheet({ item, isNew, days, allTags, members, onUnfurl, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState(item)
  const [tagText, setTagText] = useState('')
  const [geoState, setGeoState] = useState<'idle' | 'busy' | 'none'>('idle')
  const set = (patch: Partial<Item>) => setDraft((d) => ({ ...d, ...patch }))

  const [previewState, setPreviewState] = useState<'idle' | 'busy' | 'none'>('idle')
  const lastFetched = useRef<string | null>(null)
  const fetchPreview = async (url: string, replaceImage = false) => {
    if (!isUrl(url)) return
    lastFetched.current = url
    const quick = quickPreview(url)
    setDraft((d) => ({ ...d, imageUrl: (!replaceImage && d.imageUrl) || quick.image || d.imageUrl, lat: d.lat ?? quick.lat, lng: d.lng ?? quick.lng }))
    setPreviewState('busy')
    const p = await onUnfurl(url)
    setDraft((d) => {
      if (d.url !== url) return d // the link was changed while we waited
      const placeholderTitle = !d.title.trim() || d.title === domainOf(url)
      return {
        ...d,
        title: placeholderTitle && p?.title ? p.title : d.title,
        imageUrl: p?.image && (replaceImage || !d.imageUrl) ? p.image : d.imageUrl,
        lat: d.lat ?? p?.lat ?? null,
        lng: d.lng ?? p?.lng ?? null
      }
    })
    setPreviewState(p || quick.image ? 'idle' : 'none')
  }
  useEffect(() => {
    if (isNew && item.url) fetchPreview(item.url)
  }, [])

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
      {draft.imageUrl && <PreviewImage src={draft.imageUrl} onRemove={() => set({ imageUrl: '' })} />}
      {domain && (
        <div className="link-row">
          <a className="link-preview" href={draft.url!} target="_blank" rel="noreferrer">
            <Icon name="link" size={16} /> <span>{domain}</span>
          </a>
          <button type="button" className="secondary-btn" disabled={previewState === 'busy'} onClick={() => fetchPreview(draft.url!, true)}>
            {previewState === 'busy' ? 'Fetching…' : draft.imageUrl ? 'Refresh preview' : 'Get preview'}
          </button>
        </div>
      )}
      {previewState === 'busy' && !draft.imageUrl && <div className="preview-loading" aria-live="polite">Fetching preview…</div>}
      {previewState === 'none' && <span className="muted small">No preview found for this link.</span>}
      <div className="field">
        <label htmlFor="f-title">Title</label>
        <input id="f-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} autoFocus={isNew && !item.url} />
      </div>
      <div className="field">
        <label htmlFor="f-url">Link</label>
        <input
          id="f-url"
          type="url"
          placeholder="https://"
          value={draft.url ?? ''}
          onChange={(e) => set({ url: e.target.value || null })}
          onBlur={() => draft.url && draft.url !== lastFetched.current && fetchPreview(draft.url, true)}
        />
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

function PreviewImage({ src, onRemove }: { src: string; onRemove: () => void }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])
  if (broken) return null
  return (
    <div className="sheet-image">
      <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      <button type="button" className="sheet-image-remove" aria-label="Remove image" onClick={onRemove}>
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

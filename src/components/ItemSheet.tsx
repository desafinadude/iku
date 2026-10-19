import { useEffect, useRef, useState } from 'react'
import type { LinkPreview } from '../data/backend'
import { addDays, dayLabel, daysBetween, displayName, domainOf, isUrl, normalizeTag, quickPreview, shortDate } from '../lib'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Attachment, Item, Member } from '../types'
import { AttachmentList, type PendingFile } from './AttachmentList'
import { PlaceSearch } from './PlaceSearch'
import { PlaceInfo } from './PlaceInfo'
import { directionsUrl, googleMapsUrl, useGoogleOk } from '../maps/config'
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
  onManageLabels: () => void
  /** Day to use when switching an idea onto the plan. */
  defaultDay: string
  near: { lat: number; lng: number } | null
  attachments: Attachment[]
  offlineIds: Set<string>
  online: boolean
  uploading: boolean
  onUpload: (files: File[]) => void
  onOpenFile: (a: Attachment) => void
  onDeleteFile: (a: Attachment) => void
  onToggleOffline: (a: Attachment) => void
  /** Files picked before a new entry existed are handed over to upload after saving. */
  onSave: (item: Item, pendingFiles: File[]) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ItemSheet(props: Props) {
  const { item, isNew, days, allTags, members, onUnfurl, onSave, onDelete, onClose } = props
  const [draft, setDraft] = useState(item)
  const [pending, setPending] = useState<PendingFile[]>([])
  const googleOk = useGoogleOk()
  const { types, tagStyle } = useLabels()
  const [tagText, setTagText] = useState('')
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
          <button className="primary-btn wide" disabled={!draft.title.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim() }, pending.map((p) => p.file))}>
            {draft.day ? 'Save to ' + dayLabel(draft.day).dow + ' ' + dayLabel(draft.day).num + (draft.endDay ? '–' + dayLabel(draft.endDay).num : '') : 'Save to Ideas'}
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
          {types.map((s) => {
            const on = draft.type === s.name
            return (
              <button
                key={s.name}
                type="button"
                className="chip type-chip"
                style={on ? { background: s.bg, borderColor: s.color, color: s.color, fontWeight: 600 } : undefined}
                aria-pressed={on}
                onClick={() => set({ type: s.name })}
              >
                <span className="chip-icon" style={{ color: s.color }}>
                  <LabelIconView name={s.icon} size={15} />
                </span>
                {s.name}
              </button>
            )
          })}
          <button type="button" className="chip chip-more" onClick={props.onManageLabels}>
            Edit types
          </button>
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="f-tags">Tags</label>
        <div className="tag-input">
          {draft.tags.map((t) => {
            const st = tagStyle(t)
            return (
              <button key={t} type="button" className="tag-chip" style={st.color ? { background: st.color } : undefined} aria-label={`Remove ${t}`} onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })}>
                {st.icon && <LabelIconView name={st.icon} size={13} />}
                {t} ×
              </button>
            )
          })}
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
        <div className="seg" role="group" aria-label="When">
          <button type="button" className={!draft.day ? 'is-on' : ''} aria-pressed={!draft.day} onClick={() => set({ day: null, endDay: null })}>
            Unplanned idea
          </button>
          <button type="button" className={draft.day ? 'is-on' : ''} aria-pressed={!!draft.day} onClick={() => !draft.day && set({ day: props.defaultDay })}>
            On the plan
          </button>
        </div>
        {draft.day && (
          <div className="date-row">
            <div className="field">
              <label htmlFor="f-from">{draft.endDay ? (draft.type === 'Stay' ? 'Check-in' : 'From') : 'Date'}</label>
              <input
                id="f-from"
                type="date"
                min={days[0]}
                max={days[days.length - 1]}
                value={draft.day}
                onChange={(e) => {
                  const d = e.target.value
                  if (!d) return
                  // Keep the length of a multi-day entry when its start moves.
                  set({ day: d, endDay: draft.endDay ? addDays(d, daysBetween(draft.day!, draft.endDay)) : null })
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="f-to">{draft.type === 'Stay' ? 'Check-out' : 'To'}</label>
              <div className="input-with-btn">
                <input
                  id="f-to"
                  type="date"
                  min={addDays(draft.day, 1)}
                  max={days[days.length - 1]}
                  value={draft.endDay ?? ''}
                  onChange={(e) => set({ endDay: e.target.value && e.target.value > draft.day! ? e.target.value : null })}
                />
                {draft.endDay && (
                  <button type="button" className="icon-btn" aria-label="Make it a single day" onClick={() => set({ endDay: null })}>
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {draft.day && (
          <span className="muted small">
            {dayLabel(draft.day).dow} {dayLabel(draft.day).num} {dayLabel(draft.day).month}
            {draft.endDay
              ? draft.type === 'Stay'
                ? ` → ${dayLabel(draft.endDay).dow} ${dayLabel(draft.endDay).num} · ${daysBetween(draft.day, draft.endDay)} nights`
                : ` → ${dayLabel(draft.endDay).dow} ${dayLabel(draft.endDay).num} · ${daysBetween(draft.day, draft.endDay) + 1} days`
              : ' · leave “To” empty for a single day'}
          </span>
        )}
      </fieldset>

      {draft.day && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-time">{draft.type === 'Stay' && draft.endDay ? 'Check-in time' : 'Time'}</label>
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

      <PlaceSearch
        value={draft.place ?? ''}
        lat={draft.lat}
        lng={draft.lng}
        near={props.near}
        onChange={(place) => set({ place })}
        onPick={(h) =>
          set({
            place: h.placeId ? h.name : h.detail ? `${h.name}, ${h.detail.split(', ').slice(-2).join(', ')}` : h.name,
            lat: h.lat,
            lng: h.lng,
            // '' rather than null so a cleared Google place is saved as cleared.
            placeId: h.placeId ?? (draft.placeId !== null ? '' : null)
          })
        }
        onClearLocation={() => set({ lat: null, lng: null, placeId: draft.placeId !== null ? '' : null })}
      />
      {googleOk && draft.placeId && <PlaceInfo placeId={draft.placeId} />}
      {draft.lat != null && draft.lng != null && (
        <div className="maps-links">
          <a className="secondary-btn" href={googleMapsUrl({ name: draft.place, lat: draft.lat, lng: draft.lng, placeId: draft.placeId || null })!} target="_blank" rel="noreferrer">
            <Icon name="map" size={16} /> Google Maps
          </a>
          <a className="secondary-btn" href={directionsUrl({ lat: draft.lat, lng: draft.lng, placeId: draft.placeId || null })!} target="_blank" rel="noreferrer">
            <Icon name="external" size={16} /> Directions
          </a>
        </div>
      )}

      <div className="field">
        <label htmlFor="f-note">Notes</label>
        <textarea id="f-note" rows={3} value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value || null })} />
      </div>

      <div className="group">
        <h3 className="group-title">Attachments</h3>
        <AttachmentList
          attachments={props.attachments}
          pending={pending}
          members={members}
          offlineIds={props.offlineIds}
          uploading={props.uploading}
          canAdd={props.online}
          emptyText="Tickets, confirmations, PDFs or photos."
          onAdd={(files) => {
            // Existing entries upload straight away; new ones wait until the entry is saved.
            if (isNew) setPending((ps) => [...ps, ...files.map((file) => ({ key: crypto.randomUUID(), file }))])
            else props.onUpload(files)
          }}
          onRemovePending={(key) => setPending((ps) => ps.filter((p) => p.key !== key))}
          onOpen={props.onOpenFile}
          onDelete={props.onDeleteFile}
          onToggleOffline={props.onToggleOffline}
        />
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

import { useEffect, useRef, useState } from 'react'
import { isCoverRef, type LinkPreview } from '../data/backend'
import { addDays, DAY_PARTS, dayLabel, daysBetween, displayTitle, isStay, fromMinutes, prepareUpload, toMinutes, displayName, domainOf, isUrl, normalizeTag, quickPreview, shortDate, googleMapsLink } from '../lib'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Attachment, Item, Member } from '../types'
import { AttachmentList, type PendingFile } from './AttachmentList'
import { CardImage } from './CardImage'
import { Lightbox } from './Lightbox'
import { PlaceSearch } from './PlaceSearch'
import { PlaceInfo } from './PlaceInfo'
import { directionsUrl, googleMapsUrl, useGoogleOk } from '../maps/config'
import { photonLookup, useGooglePlaceLookup, type FoundPlace } from '../maps/places'
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
  /** Uploads a card image; resolves to the reference to store in imageUrl. */
  onUploadCover: (file: File) => Promise<string>
  /** Deletes an uploaded card image that ended up unused. */
  onDiscardCover: (ref: string) => void
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
  const { item, isNew, days, allTags, members, onUnfurl, onDelete } = props
  // Card images uploaded while this sheet is open; any not kept are deleted again.
  const uploaded = useRef<string[]>([])
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const discardUnused = (keep: string | null) => uploaded.current.filter((r) => r !== keep).forEach(props.onDiscardCover)
  const onClose = () => {
    discardUnused(item.imageUrl)
    props.onClose()
  }
  const onSave = (it: Item, files: File[]) => {
    discardUnused(it.imageUrl)
    props.onSave(it, files)
  }
  const useImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return setImageError('That isn’t an image.')
    setImageBusy(true)
    setImageError(null)
    try {
      const ref = await props.onUploadCover(await prepareUpload(file))
      uploaded.current.push(ref)
      setDraft((d) => ({ ...d, imageUrl: ref }))
    } catch (e) {
      setImageError((e as Error).message)
    } finally {
      setImageBusy(false)
    }
  }
  // Paste an image anywhere in the sheet to use it as the card image.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!file) return
      e.preventDefault()
      useImageFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })
  const [draft, setDraft] = useState(item)
  const [pending, setPending] = useState<PendingFile[]>([])
  const googleOk = useGoogleOk()
  const { tags: knownTags, tagStyle } = useLabels()
  const lookupPlace = useGooglePlaceLookup()
  const [tagText, setTagText] = useState('')
  // The tag list opens under the box while you pick; tap a tag to tick or untick it.
  const [tagsOpen, setTagsOpen] = useState(false)
  const tagBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!tagsOpen) return
    const onDown = (e: PointerEvent) => !tagBox.current?.contains(e.target as Node) && setTagsOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [tagsOpen])
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
      // A saved post (e.g. a Pinterest pin) links to the real page: use that as the link,
      // and keep the caption and the pin in the note.
      const source = p?.sourceUrl && p.sourceUrl !== url ? p.sourceUrl : null
      if (source) lastFetched.current = source
      const pinLine = source && p?.pageUrl ? `Pinned from ${p.pageUrl}` : null
      const note = d.note?.trim() ? d.note : [p?.description, pinLine].filter(Boolean).join('\n\n') || d.note
      return {
        ...d,
        // A pin with no source keeps the full pin link rather than a pin.it short link.
        url: source ?? (p?.pageUrl && /pinterest\./i.test(p.pageUrl) ? p.pageUrl : d.url),
        note: source ? note : d.note,
        title: placeholderTitle && p?.title ? p.title : d.title,
        imageUrl: p?.image && (replaceImage || !d.imageUrl) ? p.image : d.imageUrl,
        lat: d.lat ?? p?.lat ?? null,
        lng: d.lng ?? p?.lng ?? null
      }
    })
    setPreviewState(p || quick.image ? 'idle' : 'none')
    // A Google Maps link: the page itself only has a generic map picture, so look the place up instead
    // for its name, address, photo and exact spot (it then shows on the map).
    const maps = googleMapsLink(p?.pageUrl ?? url) ?? googleMapsLink(url)
    if (maps?.name) {
      const near = maps.lat != null && maps.lng != null ? { lat: maps.lat, lng: maps.lng } : (props.near ?? null)
      let found: FoundPlace | null = null
      try {
        found = (googleOk ? await lookupPlace(maps.name, near) : null) ?? (await photonLookup(maps.name, near))
      } catch {
        /* no match: keep what the link gave */
      }
      setDraft((d) => {
        if (d.url !== url) return d
        const placeholderTitle = !d.title.trim() || d.title === domainOf(url) || d.title === 'Google Maps'
        const genericImage = !d.imageUrl || /maps\/api\/staticmap|google\.com\/images\/branding/.test(d.imageUrl)
        // Google's own name for the place; otherwise the name in the link (OpenStreetMap's can be vaguer).
        const name = found?.placeId ? found.name : maps.name!
        return {
          ...d,
          title: placeholderTitle ? name : d.title,
          imageUrl: found?.photo && (replaceImage || genericImage) ? found.photo : genericImage && d.imageUrl && /staticmap/.test(d.imageUrl) ? null : d.imageUrl,
          place: d.place?.trim() ? d.place : found?.address ? `${name}, ${found.address}` : name,
          // The link's own pin is exact; the lookup fills in when the link has none.
          lat: maps.lat ?? found?.lat ?? d.lat,
          lng: maps.lng ?? found?.lng ?? d.lng,
          placeId: found?.placeId ?? d.placeId
        }
      })
      if (found || maps.lat != null) setPreviewState('idle')
    }
  }
  useEffect(() => {
    if (isNew && item.url) fetchPreview(item.url)
  }, [])

  const addTag = (raw: string) => {
    const typed = normalizeTag(raw)
    // Reuse an existing tag's spelling ("food" → "Food").
    const t = knownTags.find((k) => k.name.toLowerCase() === typed.toLowerCase())?.name ?? typed
    if (t && !draft.tags.some((x) => x.toLowerCase() === t.toLowerCase())) set({ tags: [...draft.tags, t] })
    setTagText('')
  }


  // Every tag, coloured ones first, then others in use; filtered as you type.
  const q = normalizeTag(tagText).toLowerCase()
  const tagOptions = [...new Set([...knownTags.map((t) => t.name), ...allTags])].filter((t) => !q || t.toLowerCase().includes(q))
  const canCreate = !!q && ![...knownTags.map((t) => t.name), ...allTags].some((t) => t.toLowerCase() === q)
  const toggleTag = (t: string) => (draft.tags.includes(t) ? set({ tags: draft.tags.filter((x) => x !== t) }) : set({ tags: [...draft.tags, t] }))
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
                if (confirm(`Delete “${displayTitle(draft)}”?`)) onDelete(draft.id)
              }}
            >
              <Icon name="trash" />
            </button>
          )}
          <button className="primary-btn wide" disabled={(!draft.title.trim() && !draft.imageUrl) || imageBusy} onClick={() => onSave({ ...draft, title: draft.title.trim() }, pending.map((p) => p.file))}>
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
      <div className="image-field">
        {draft.imageUrl ? (
          <div className="sheet-image">
            <button type="button" className="sheet-image-open" aria-label="View image full screen" onClick={() => setLightbox(true)}>
              <CardImage imageUrl={draft.imageUrl} loading="eager" />
            </button>
            <div className="sheet-image-actions">
              <button type="button" className="chip" onClick={() => imageInput.current?.click()} disabled={imageBusy}>
                <Icon name="image" size={15} /> Replace
              </button>
              <button type="button" className="chip" aria-label="Remove image" onClick={() => set({ imageUrl: '' })}>
                <Icon name="close" size={15} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="image-empty">
            <button type="button" className="secondary-btn" onClick={() => imageInput.current?.click()} disabled={imageBusy}>
              <Icon name="image" size={16} /> {imageBusy ? 'Uploading…' : 'Add photo'}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setLinkOpen((v) => !v)}>
              <Icon name="link" size={16} /> Image link
            </button>
            <span className="muted small">or paste an image</span>
          </div>
        )}
        {linkOpen && !draft.imageUrl && (
          <input
            className="image-link-input"
            type="url"
            placeholder="https://…/photo.jpg"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (isUrl(v)) {
                set({ imageUrl: v })
                setLinkOpen(false)
              }
            }}
          />
        )}
        {imageBusy && draft.imageUrl && <span className="muted small">Uploading…</span>}
        {imageError && <p className="error">{imageError}</p>}
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) useImageFile(f)
          }}
        />
      </div>
      {lightbox && draft.imageUrl && <Lightbox imageUrl={draft.imageUrl} onClose={() => setLightbox(false)} />}
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
          onBlur={() => draft.url && draft.url !== lastFetched.current && fetchPreview(draft.url, !isCoverRef(draft.imageUrl))}
        />
      </div>

      <div className="field">
        <label htmlFor="f-tags">Tags</label>
        <div className="tag-select" ref={tagBox}>
          <div className="tag-input" onClick={() => setTagsOpen(true)}>
            {draft.tags.map((t) => {
              const st = tagStyle(t)
              return (
                <button
                  key={t}
                  type="button"
                  className={`tag-chip${st.color ? '' : ' is-plain'}`}
                  style={st.color ? { background: st.color, color: st.fg } : undefined}
                  aria-label={`Remove ${t}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    set({ tags: draft.tags.filter((x) => x !== t) })
                  }}
                >
                  {st.icon && <LabelIconView name={st.icon} size={14} />}
                  {t} ×
                </button>
              )
            })}
            <input
              id="f-tags"
              role="combobox"
              aria-expanded={tagsOpen}
              aria-controls="f-tags-list"
              autoComplete="off"
              placeholder={draft.tags.length ? 'Add tag' : 'Choose tags…'}
              value={tagText}
              onFocus={() => setTagsOpen(true)}
              onChange={(e) => {
                setTagText(e.target.value)
                setTagsOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  // Enter picks the only match, or makes a new tag from what you typed.
                  if (tagText.trim()) addTag(tagOptions.length === 1 && !canCreate ? tagOptions[0] : tagText)
                } else if (e.key === 'Backspace' && !tagText && draft.tags.length) {
                  set({ tags: draft.tags.slice(0, -1) })
                } else if (e.key === 'Escape' && tagsOpen) {
                  e.stopPropagation()
                  setTagsOpen(false)
                }
              }}
            />
            <Icon name="chevronDown" size={16} />
          </div>
          {tagsOpen && (
            <div className="tag-select-list" id="f-tags-list" role="listbox" aria-multiselectable="true" aria-label="Tags">
              {canCreate && (
                <button type="button" className="tag-option tag-option-new" onClick={() => addTag(tagText)}>
                  <Icon name="plus" size={14} /> Add “{normalizeTag(tagText)}”
                </button>
              )}
              {tagOptions.map((t) => {
                const st = tagStyle(t)
                const on = draft.tags.includes(t)
                return (
                  <button key={t} type="button" role="option" aria-selected={on} className={`tag-option${on ? ' is-on' : ''}`} onClick={() => toggleTag(t)}>
                    <span className="tag-option-check">{on && <Icon name="check" size={13} strokeWidth={3} />}</span>
                    <span className="tag-option-swatch" style={st.color ? { background: st.color, color: st.fg } : undefined}>
                      {st.icon && <LabelIconView name={st.icon} size={13} />}
                    </span>
                    {t}
                  </button>
                )
              })}
              {!tagOptions.length && !canCreate && <p className="muted small tag-option-empty">No tags yet: type one.</p>}
              <div className="tag-select-foot">
                <button type="button" className="chip chip-small" onClick={props.onManageLabels}>
                  Edit tags
                </button>
                <button type="button" className="primary-btn" onClick={() => (setTagsOpen(false), setTagText(''))}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="muted small">The first coloured tag sets the card’s colour and map pin.</span>
      </div>

      {members.length > 0 && (
        <div className="field">
          <span className="field-label">People</span>
          <div className="chip-wrap">
            {members.map((m) => {
              const on = (draft.people ?? []).includes(m.email)
              return (
                <button
                  key={m.email}
                  type="button"
                  className={`chip chip-person${on ? ' is-on-dark' : ''}`}
                  aria-pressed={on}
                  onClick={() => set({ people: on ? draft.people.filter((p) => p !== m.email) : [...(draft.people ?? []), m.email] })}
                >
                  <Avatar member={m} size={22} />
                  {displayName(m)}
                </button>
              )
            })}
          </div>
          <span className="muted small">Shown as face badges on the card; filter by people from the filters.</span>
        </div>
      )}

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
              <label htmlFor="f-from">{draft.endDay ? (isStay(draft) ? 'Check-in' : 'From') : 'Date'}</label>
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
              <label htmlFor="f-to">{isStay(draft) ? 'Check-out' : 'To'}</label>
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
              ? isStay(draft)
                ? ` → ${dayLabel(draft.endDay).dow} ${dayLabel(draft.endDay).num} · ${daysBetween(draft.day, draft.endDay)} nights`
                : ` → ${dayLabel(draft.endDay).dow} ${dayLabel(draft.endDay).num} · ${daysBetween(draft.day, draft.endDay) + 1} days`
              : ' · leave “To” empty for a single day'}
          </span>
        )}
      </fieldset>

      {draft.day && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-time">{isStay(draft) && draft.endDay ? 'Check-in' : 'From'}</label>
            <input
              id="f-time"
              type="time"
              value={draft.time ?? ''}
              onChange={(e) => {
                const time = e.target.value || null
                // Keep the duration when the start time moves.
                const mins = draft.time && draft.endTime ? toMinutes(draft.endTime) - toMinutes(draft.time) : null
                set({ time, part: time ? null : draft.part, endTime: time && mins && mins > 0 ? fromMinutes(toMinutes(time) + mins) : time ? draft.endTime : null })
              }}
            />
          </div>
          {!(isStay(draft) && draft.endDay) && (
            <div className="field">
              <label htmlFor="f-end-time">Until</label>
              <input
                id="f-end-time"
                type="time"
                disabled={!draft.time}
                value={draft.endTime ?? ''}
                onChange={(e) => set({ endTime: e.target.value && draft.time && e.target.value > draft.time ? e.target.value : null })}
              />
            </div>
          )}
          <label className="check">
            <input type="checkbox" checked={draft.booked} onChange={(e) => set({ booked: e.target.checked })} /> Booked
          </label>
        </div>
      )}
      {draft.day && !draft.time && (
        <div className="field">
          <span className="field-label" id="f-part-label">Time of day</span>
          <div className="seg seg-small part-seg" role="group" aria-labelledby="f-part-label">
            {[{ id: null, label: 'Any' }, ...DAY_PARTS].map((p) => (
              <button key={p.id ?? 'any'} type="button" className={draft.part === p.id ? 'is-on' : ''} aria-pressed={draft.part === p.id} onClick={() => set({ part: p.id })}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={draft.chapter} onChange={(e) => set({ chapter: e.target.checked })} /> Title card: show it as a big picture with its title, to mark a new chapter (e.g. arriving in a city)
      </label>
      <label className="check">
        <input type="checkbox" checked={draft.pinned} onChange={(e) => set({ pinned: e.target.checked })} /> Pin to the top{draft.day ? ' of its day' : ' of the ideas'}
      </label>
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

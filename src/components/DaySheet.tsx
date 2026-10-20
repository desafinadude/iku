import { useRef, useState } from 'react'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels } from '../labels/LabelsContext'
import { dayLabel, isUrl, normalizeTag, prepareUpload } from '../lib'
import { CardImage } from './CardImage'
import { Icon } from './Icon'
import { inkColor, onColor } from '../colors'
import type { DayInfo } from '../types'
import { ColorSwatches } from './ColorSwatches'
import { Sheet } from './Sheet'

interface Props {
  day: string
  days: string[]
  onSave: (list: DayInfo[]) => void
  onClose: () => void
  /** Uploads an image; resolves to the reference to store. */
  onUploadCover: (file: File) => Promise<string>
}

/** Title, tag and colour for a day, optionally applied to the following days too (a stay in one city). */
export function DaySheet({ day, days, onSave, onClose, onUploadCover }: Props) {
  const { dayStyle, tags, tagStyle } = useLabels()
  const current = dayStyle(day).info
  const [title, setTitle] = useState(current?.title ?? '')
  const [tag, setTag] = useState(current?.tag ?? '')
  const [color, setColor] = useState<string | null>(current?.color ?? null)
  const [through, setThrough] = useState(day)
  const [image, setImage] = useState<string | null>(current?.image ?? null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const uploadImage = async (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    setImageBusy(true)
    setImageError(null)
    try {
      setImage(await onUploadCover(await prepareUpload(file)))
    } catch (e) {
      setImageError((e as Error).message)
    } finally {
      setImageBusy(false)
    }
  }
  const l = dayLabel(day)
  const tagColor = tag ? tagStyle(normalizeTag(tag)).color : null
  const shown = color ?? tagColor
  const later = days.filter((d) => d > day)

  const save = (clear = false) => {
    const range = days.filter((d) => d >= day && d <= through)
    const t = normalizeTag(tag)
    // The opening image belongs to this day only; the following days keep their own.
    const imageFor = (d: string) => (d === day ? (clear ? null : image) : (dayStyle(d).info?.image ?? null))
    onSave(range.map((d) => (clear ? { day: d, title: null, tag: null, color: null, image: imageFor(d) } : { day: d, title: title.trim() || null, tag: t || null, color, image: imageFor(d) })))
    onClose()
  }

  return (
    <Sheet
      title={`${l.dow} ${l.num} ${l.month}`}
      onClose={onClose}
      footer={
        <>
          {current && (
            <button className="secondary-btn danger-text" onClick={() => save(true)}>
              Clear
            </button>
          )}
          <button className="primary-btn wide" disabled={imageBusy} onClick={() => save()}>
            Save{through !== day ? ` for ${days.filter((d) => d >= day && d <= through).length} days` : ''}
          </button>
        </>
      }
    >
      <div className="day-preview" style={{ background: shown ?? 'var(--soft)', color: shown ? onColor(shown) : 'var(--ink)' }}>
        <span className="day-num">{l.num}</span>
        <span>
          <b>{title.trim() || tag || 'Untitled day'}</b>
          <span className="small"> · {l.dow}</span>
        </span>
      </div>

      <div className="field">
        <label htmlFor="day-image-file">Opening image</label>
        {image ? (
          <div className="sheet-image day-image-pick">
            <CardImage imageUrl={image} loading="eager" />
            <div className="sheet-image-actions">
              <button type="button" className="chip" onClick={() => imageInput.current?.click()} disabled={imageBusy}>
                <Icon name="image" size={15} /> Replace
              </button>
              <button type="button" className="chip" aria-label="Remove image" onClick={() => setImage(null)}>
                <Icon name="close" size={15} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="image-empty">
            <button type="button" className="secondary-btn" onClick={() => imageInput.current?.click()} disabled={imageBusy}>
              <Icon name="image" size={16} /> {imageBusy ? 'Uploading…' : 'Add image'}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setLinkOpen((v) => !v)}>
              <Icon name="link" size={16} /> Image link
            </button>
          </div>
        )}
        {linkOpen && !image && (
          <input
            className="image-link-input"
            type="url"
            placeholder="https://…/photo.jpg"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (isUrl(v)) {
                setImage(v)
                setLinkOpen(false)
              }
            }}
          />
        )}
        <input ref={imageInput} id="day-image-file" type="file" accept="image/*" hidden onChange={(e) => uploadImage(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
        {imageError && <p className="error">{imageError}</p>}
        <span className="muted small">Shown at the top of this day, like the opening of a chapter. It stays on this day only.</span>
      </div>

      <div className="field">
        <label htmlFor="day-title">Title</label>
        <input id="day-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kyoto, or Tokyo → Kyoto" autoFocus />
      </div>

      <div className="field">
        <label htmlFor="day-tag">Day tag</label>
        <input id="day-tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Kyoto" list="day-tag-options" />
        <datalist id="day-tag-options">
          {tags.map((t) => (
            <option key={t.name} value={t.name} />
          ))}
        </datalist>
        <div className="chip-wrap tag-picks">
          {tags
            .filter((t) => t.color)
            .slice(0, 12)
            .map((t) => (
              <button key={t.name} type="button" className="suggest" style={normalizeTag(tag) === t.name ? { background: t.color!, borderColor: t.color!, color: onColor(t.color) } : { borderColor: t.color!, color: inkColor(t.color) }} aria-pressed={normalizeTag(tag) === t.name} onClick={() => setTag(t.name)}>
                {t.icon && <LabelIconView name={t.icon} size={14} />} {t.name}
              </button>
            ))}
        </div>
      </div>

      <fieldset className="group">
        <legend>Colour</legend>
        <ColorSwatches value={color} onChange={setColor} none={{ label: tagColor ? 'Use the tag’s colour' : 'No colour', color: tagColor }} />
        <span className="muted small">{tagColor && !color ? `Using ${normalizeTag(tag)}’s colour.` : 'Pick a colour, or leave the first one to use the day tag’s colour.'}</span>
      </fieldset>

      {later.length > 0 && (
        <div className="field">
          <label htmlFor="day-through">Same for the following days, through</label>
          <select id="day-through" value={through} onChange={(e) => setThrough(e.target.value)}>
            <option value={day}>Just this day</option>
            {later.map((d) => {
              const dl = dayLabel(d)
              return (
                <option key={d} value={d}>
                  {dl.dow} {dl.num} {dl.month}
                </option>
              )
            })}
          </select>
        </div>
      )}
    </Sheet>
  )
}

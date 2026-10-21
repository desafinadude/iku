import { useState } from 'react'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels } from '../labels/LabelsContext'
import { dayLabel, normalizeTag } from '../lib'
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
  /** Adds a title card on this day (a big picture with a title, marking a new chapter). */
  onAddTitleCard: (day: string, title: string) => void
}

/** Title, tag and colour for a day, optionally applied to the following days too (a stay in one city). */
export function DaySheet({ day, days, onSave, onClose, onAddTitleCard }: Props) {
  const { dayStyle, tags, tagStyle } = useLabels()
  const current = dayStyle(day).info
  const [title, setTitle] = useState(current?.title ?? '')
  const [tag, setTag] = useState(current?.tag ?? '')
  const [color, setColor] = useState<string | null>(current?.color ?? null)
  const [headerColor, setHeaderColor] = useState<string | null>(current?.headerColor ?? null)
  const [blendColor, setBlendColor] = useState<string | null>(current?.blendColor ?? null)
  const nextDay = days[days.indexOf(day) + 1]
  const nextColor = nextDay ? dayStyle(nextDay).color : null
  const [through, setThrough] = useState(day)
  const l = dayLabel(day)
  const tagColor = tag ? tagStyle(normalizeTag(tag)).color : null
  const shown = color ?? tagColor
  const later = days.filter((d) => d > day)

  const save = (clear = false) => {
    const range = days.filter((d) => d >= day && d <= through)
    const t = normalizeTag(tag)
    // The header colour goes on every day in the range; the blend only on this (transition) day.
    const blendFor = (d: string) => (d === day ? (clear ? null : blendColor) : (dayStyle(d).info?.blendColor ?? null))
    onSave(
      range.map((d) =>
        clear
          ? { day: d, title: null, tag: null, color: null, image: null, headerColor: null, blendColor: blendFor(d) }
          : { day: d, title: title.trim() || null, tag: t || null, color, image: null, headerColor, blendColor: blendFor(d) }
      )
    )
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
          <button className="primary-btn wide" onClick={() => save()}>
            Save{through !== day ? ` for ${days.filter((d) => d >= day && d <= through).length} days` : ''}
          </button>
        </>
      }
    >
      <div className="day-preview" style={{ background: blendColor ? `linear-gradient(to right, ${shown ?? '#edeeea'}, ${blendColor})` : (shown ?? 'var(--soft)'), color: shown ? onColor(shown) : 'var(--ink)' }}>
        <span className="day-num">{l.num}</span>
        <span>
          <b>{title.trim() || tag || 'Untitled day'}</b>
          <span className="small"> · {l.dow}</span>
        </span>
      </div>

      <div className="field">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            // Opens the new card in the editor (replacing this sheet) to add its picture.
            onAddTitleCard(day, title.trim() || normalizeTag(tag))
          }}
        >
          <Icon name="image" size={16} /> Add a title card to this day
        </button>
        <span className="muted small">A big picture with a title, like “Nagano”, placed where the new chapter starts (drag it to the evening, say).</span>
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
              <button key={t.name} type="button" className="suggest" style={normalizeTag(tag) === t.name ? { background: t.color!, borderColor: t.color!, color: t.fg } : { borderColor: t.color!, color: inkColor(t.color) }} aria-pressed={normalizeTag(tag) === t.name} onClick={() => setTag(t.name)}>
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

      <fieldset className="group">
        <legend>Header colour</legend>
        <ColorSwatches value={headerColor} onChange={setHeaderColor} none={{ label: 'Default grey' }} />
      </fieldset>

      <fieldset className="group">
        <legend>Blend into (a travel day)</legend>
        {nextColor && (
          <button type="button" className={`chip chip-small${blendColor === nextColor ? ' is-on' : ''}`} onClick={() => setBlendColor(nextColor)}>
            <span className="dot" style={{ background: nextColor }} /> Next day’s colour
          </button>
        )}
        <ColorSwatches value={blendColor} onChange={setBlendColor} none={{ label: 'No blend' }} />
        <span className="muted small">The column fades from this day’s colour at the top into this colour at the bottom, for a day you move between places.</span>
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

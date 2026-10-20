import { useState } from 'react'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels } from '../labels/LabelsContext'
import { dayLabel, normalizeTag } from '../lib'
import { LABEL_COLORS, type DayInfo } from '../types'
import { Sheet } from './Sheet'

interface Props {
  day: string
  days: string[]
  onSave: (list: DayInfo[]) => void
  onClose: () => void
}

/** Title, tag and colour for a day, optionally applied to the following days too (a stay in one city). */
export function DaySheet({ day, days, onSave, onClose }: Props) {
  const { dayStyle, tags, tagStyle } = useLabels()
  const current = dayStyle(day).info
  const [title, setTitle] = useState(current?.title ?? '')
  const [tag, setTag] = useState(current?.tag ?? '')
  const [color, setColor] = useState<string | null>(current?.color ?? null)
  const [through, setThrough] = useState(day)
  const l = dayLabel(day)
  const tagColor = tag ? tagStyle(normalizeTag(tag)).color : null
  const shown = color ?? tagColor
  const later = days.filter((d) => d > day)

  const save = (clear = false) => {
    const range = days.filter((d) => d >= day && d <= through)
    const t = normalizeTag(tag)
    onSave(range.map((d) => (clear ? { day: d, title: null, tag: null, color: null } : { day: d, title: title.trim() || null, tag: t || null, color })))
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
      <div className="day-preview" style={{ background: shown ?? 'var(--soft)', color: shown ? '#fff' : 'var(--ink)' }}>
        <span className="day-num">{l.num}</span>
        <span>
          <b>{title.trim() || tag || 'Untitled day'}</b>
          <span className="small"> · {l.dow}</span>
        </span>
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
              <button key={t.name} type="button" className="suggest" style={normalizeTag(tag) === t.name ? { background: t.color!, borderColor: t.color!, color: '#fff' } : { borderColor: t.color!, color: t.color! }} aria-pressed={normalizeTag(tag) === t.name} onClick={() => setTag(t.name)}>
                {t.icon && <LabelIconView name={t.icon} size={14} />} {t.name}
              </button>
            ))}
        </div>
      </div>

      <fieldset className="group">
        <legend>Colour</legend>
        <div className="swatches">
          <button type="button" className={`swatch swatch-none${!color ? ' is-on' : ''}`} aria-label={tagColor ? 'Use the tag’s colour' : 'No colour'} title={tagColor ? 'Use the tag’s colour' : 'No colour'} aria-pressed={!color} onClick={() => setColor(null)} style={tagColor ? { background: tagColor } : undefined} />
          {LABEL_COLORS.map((c) => (
            <button key={c} type="button" className={`swatch${color === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
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

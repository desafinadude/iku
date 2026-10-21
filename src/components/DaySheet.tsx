import { useState } from 'react'
import { useLabels } from '../labels/LabelsContext'
import { dayLabel } from '../lib'
import { Icon } from './Icon'
import { colorCss, colorStops, firstColor, onColor } from '../colors'
import { tint } from '../labels/LabelsContext'
import type { DayInfo } from '../types'
import { ColorField } from './ColorField'
import { Sheet } from './Sheet'

interface Props {
  day: string
  days: string[]
  onSave: (list: DayInfo[]) => void
  onClose: () => void
  /** Adds a title card on this day (a big picture with a title, marking a new chapter). */
  onAddTitleCard: (day: string, title: string) => void
}

/** Title and colours for a day, optionally applied to the following days too (a stay in one city). */
export function DaySheet({ day, days, onSave, onClose, onAddTitleCard }: Props) {
  const { dayStyle, tagStyle } = useLabels()
  const current = dayStyle(day).info
  // Days used to have a tag; its name and colour carry over as the title and colour.
  const [title, setTitle] = useState(current?.title ?? current?.tag ?? '')
  const startColor = current?.color ?? (current?.tag ? tagStyle(current.tag).color : null)
  const [column, setColumn] = useState<string | null>(startColor ? (current?.blendColor ? `${startColor}>${current.blendColor}` : startColor) : null)
  const [header, setHeader] = useState<string | null>(current?.headerColor ?? null)
  const [headerText, setHeaderText] = useState<string | null>(current?.headerText ?? null)
  // With no column colour of its own, the column is a very pale version of the header colour.
  const autoColumn = colorStops(header).map((c) => tint(c, 0.12)).join('>') || null
  const [through, setThrough] = useState(day)
  const l = dayLabel(day)
  const later = days.filter((d) => d > day)
  const [colA, colB] = colorStops(column)

  const save = (clear = false) => {
    const range = days.filter((d) => d >= day && d <= through)
    onSave(
      range.map((d) =>
        clear
          ? { day: d, title: null, tag: null, color: null, image: null, headerColor: null, headerText: null, blendColor: null }
          : { day: d, title: title.trim() || null, tag: null, color: colA ?? null, image: null, headerColor: header, headerText, blendColor: colB ?? null }
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
      {/* A preview of the column: header band over the day's background. */}
      <div className="day-preview-col" style={{ background: colorCss(column ?? autoColumn) ?? '#edeeea' }}>
        <div className="day-preview-head" style={{ background: colorCss(header) ?? '#dfe1dc', color: headerText ?? (header ? onColor(firstColor(header)) : 'var(--ink)') }}>
          <span className="day-num">{l.num}</span>
          <span>
            <b>{title.trim() || 'Untitled day'}</b>
            <span className="small"> · {l.dow}</span>
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="day-title">Title</label>
        <input id="day-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kyoto, or Tokyo → Kyoto" autoFocus />
      </div>

      <div className="field">
        <span className="field-label">Colours</span>
        <ColorField label="Header" value={header} onChange={setHeader} none="Default grey" emptyText="Default" gradient />
        <ColorField label="Header text" value={headerText} onChange={setHeaderText} none="Automatic" emptyText="Automatic" quick />
        <ColorField label="Column" value={column} onChange={setColumn} none="Automatic (pale header colour)" emptyText={header ? 'Pale header colour' : 'None'} gradient />
        <span className="muted small">The column is a very pale version of the header unless you pick its own colour. Tick Gradient on the header for a travel day, e.g. Tokyo’s colour at the top fading into Kyoto’s.</span>
      </div>

      <div className="field">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            // Opens the new card in the editor (replacing this sheet) to add its picture.
            onAddTitleCard(day, title.trim())
          }}
        >
          <Icon name="image" size={16} /> Add a title card to this day
        </button>
        <span className="muted small">A big picture with a title, like “Nagano”, placed where the new chapter starts (drag it to the evening, say).</span>
      </div>

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

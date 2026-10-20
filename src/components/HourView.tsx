import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import { addDays, dayLabel, displayTitle, fromMinutes, itemsForDay, spanLabel, toMinutes } from '../lib'
import { CardImage } from './CardImage'
import type { Item } from '../types'
import type { Prefs } from '../usePrefs'
import { Icon } from './Icon'
import { TagChips } from './TagChips'

const HOUR = 60 // px per hour
const DEFAULT_MINUTES = 60

interface Props {
  day: string
  days: string[]
  items: Item[]
  prefs: Prefs
  viewSwitch?: ReactNode
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  onAddAt: (day: string, time: string) => void
}

/** Multi-day entries (stays) and untimed entries go in the "All day" strip, not the hours. */
const isAllDay = (x: Item) => !x.time || !!(x.endDay && x.endDay !== x.day)

interface Placed {
  item: Item
  start: number
  end: number
  lane: number
  lanes: number
}

/** Puts overlapping entries side by side: each cluster of overlaps shares its width. */
function layout(items: Item[]): Placed[] {
  const placed = items
    .map((item) => {
      const start = toMinutes(item.time!)
      const end = item.endTime && toMinutes(item.endTime) > start ? toMinutes(item.endTime) : start + DEFAULT_MINUTES
      return { item, start, end, lane: 0, lanes: 1 }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)
  let cluster: Placed[] = []
  let clusterEnd = -1
  const close = () => cluster.forEach((p) => (p.lanes = Math.max(...cluster.map((c) => c.lane)) + 1))
  for (const p of placed) {
    if (p.start >= clusterEnd) {
      close()
      cluster = []
    }
    const used = new Set(cluster.filter((c) => c.end > p.start).map((c) => c.lane))
    while (used.has(p.lane)) p.lane++
    cluster.push(p)
    clusterEnd = Math.max(clusterEnd, p.end)
  }
  close()
  return placed
}

export function HourView({ day, days, items, prefs, viewSwitch, onSelectDay, onOpen, onAddAt }: Props) {
  const { itemStyle } = useLabels()
  const dayItems = itemsForDay(items, day).filter((x) => !prefs.hideRepeats || x.day === day)
  const allDay = dayItems.filter(isAllDay)
  const placed = layout(dayItems.filter((x) => !isAllDay(x)))
  const first = Math.min(7, ...placed.map((p) => Math.floor(p.start / 60)))
  const last = Math.max(22, ...placed.map((p) => Math.ceil(p.end / 60)))
  const hours = Array.from({ length: last - first }, (_, i) => first + i)
  const l = dayLabel(day)
  const idx = days.indexOf(day)
  const now = new Date()
  const isToday = now.toISOString().slice(0, 10) === day
  const nowMin = now.getHours() * 60 + now.getMinutes()

  return (
    <section aria-label="Hour by hour" className="pane pane-hours">
      <div className="pane-head hours-head">
        <h2>
          {l.dow} {l.num} {l.month}
        </h2>
        {viewSwitch}
        <span className="spacer" />
        <button className="icon-btn nav-btn" aria-label="Previous day" disabled={idx <= 0} onClick={() => onSelectDay(addDays(day, -1))}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <span className="muted small">
          Day {idx + 1} of {days.length}
        </span>
        <button className="icon-btn nav-btn" aria-label="Next day" disabled={idx >= days.length - 1} onClick={() => onSelectDay(addDays(day, 1))}>
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <div className="hours-scroll">
        {allDay.length > 0 && (
          <div className="all-day">
            <span className="all-day-label">All day</span>
            <div className="all-day-items">
              {allDay.map((x) => {
                const s = itemStyle(x)
                const span = spanLabel(x, day)
                const repeat = x.day !== day
                return (
                  <button key={x.id} className={`all-day-item${repeat ? ' is-repeat' : ''}`} style={{ background: s.color }} onClick={() => onOpen(x)}>
                    <LabelIconView name={s.icon} size={16} />
                    <b>{displayTitle(x)}</b>
                    {span && <span className="all-day-span">{span}</span>}
                    {(!repeat || prefs.tagsOnRepeats) && x.tags.length > 0 && (
                      <span className="tag-row on-solid">
                        <TagChips tags={x.tags} small />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="hour-grid" style={{ height: hours.length * HOUR }}>
          {hours.map((h) => (
            <HourSlot key={h} day={day} hour={h} top={(h - first) * HOUR} onAdd={() => onAddAt(day, fromMinutes(h * 60))} />
          ))}
          {placed.map((p) => (
            <HourEvent key={p.item.id} p={p} first={first} onOpen={onOpen} />
          ))}
          {isToday && nowMin >= first * 60 && nowMin <= last * 60 && <div className="now-line" style={{ top: (nowMin / 60 - first) * HOUR }} aria-hidden="true" />}
        </div>
      </div>
    </section>
  )
}

function HourSlot({ day, hour, top, onAdd }: { day: string; hour: number; top: number; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${day}:${String(hour).padStart(2, '0')}` })
  return (
    <div ref={setNodeRef} className={`hour-slot${isOver ? ' is-over' : ''}`} style={{ top, height: HOUR }}>
      <span className="hour-label">{String(hour).padStart(2, '0')}:00</span>
      <button className="hour-add" aria-label={`Add something at ${String(hour).padStart(2, '0')}:00`} onClick={onAdd} />
    </div>
  )
}

function HourEvent({ p, first, onOpen }: { p: Placed; first: number; onOpen: (item: Item) => void }) {
  const { itemStyle } = useLabels()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.item.id })
  const s = itemStyle(p.item)
  const height = Math.max(28, ((p.end - p.start) / 60) * HOUR - 2)
  const width = `calc((100% - 64px) / ${p.lanes})`
  const tall = height >= 56
  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      className={`hour-event${isDragging ? ' is-dragging' : ''}${tall ? ' is-tall' : ''}`}
      style={{ top: (p.start / 60 - first) * HOUR + 1, height, left: `calc(60px + ${p.lane} * ${width})`, width, background: s.bg, borderColor: s.color }}
      onClick={() => onOpen(p.item)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(p.item)}
      aria-label={`${p.item.time}${p.item.endTime ? '–' + p.item.endTime : ''} ${displayTitle(p.item)}`}
    >
      {tall && p.item.imageUrl && <CardImage className="hour-thumb" imageUrl={p.item.imageUrl} />}
      <div className="hour-event-body">
        <span className="hour-event-time" style={{ color: s.color }}>
          <LabelIconView name={s.icon} size={14} /> {p.item.time}
          {p.item.endTime ? `–${p.item.endTime}` : ''}
        </span>
        <b>{displayTitle(p.item)}</b>
        {tall && p.item.tags.length > 0 && (
          <span className="tag-row">
            <TagChips tags={p.item.tags} small />
          </span>
        )}
      </div>
    </article>
  )
}

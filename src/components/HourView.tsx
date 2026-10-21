import { useDraggable, useDroppable } from '@dnd-kit/core'
import { inkColor, onColor } from '../colors'
import type { ReactNode } from 'react'
import { useSwipe } from '../useSwipe'
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
  /** Wide screens: the button that gives this view the whole workspace. */
  maxToggle?: ReactNode
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  onAddAt: (day: string, time: string) => void
  onEditDay: (day: string) => void
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

export function HourView({ day, days, items, prefs, viewSwitch, maxToggle, onSelectDay, onOpen, onAddAt, onEditDay }: Props) {
  const { dayStyle } = useLabels()
  const ds = dayStyle(day)
  const dayItems = itemsForDay(items, day).filter((x) => !prefs.hideRepeats || x.day === day)
  const allDay = dayItems.filter(isAllDay)
  const placed = layout(dayItems.filter((x) => !isAllDay(x)))
  const first = Math.min(7, ...placed.map((p) => Math.floor(p.start / 60)))
  const last = Math.max(22, ...placed.map((p) => Math.ceil(p.end / 60)))
  const hours = Array.from({ length: last - first }, (_, i) => first + i)
  const l = dayLabel(day)
  const idx = days.indexOf(day)
  const swipe = useSwipe(
    () => idx > 0 && onSelectDay(addDays(day, -1)),
    () => idx < days.length - 1 && onSelectDay(addDays(day, 1))
  )
  const now = new Date()
  const isToday = now.toISOString().slice(0, 10) === day
  const nowMin = now.getHours() * 60 + now.getMinutes()

  return (
    <section aria-label="Hour by hour" className="pane pane-hours" {...swipe}>
      <div className="pane-head hours-head">
        <h2>
          {l.dow} {l.num} {l.month}
        </h2>
        {(ds.title || ds.tag) && (
          <span className="day-banner" style={ds.color ? { background: ds.color, color: onColor(ds.color) } : undefined}>
            {ds.title ?? ds.tag}
          </span>
        )}
        <button className="icon-btn nav-btn" aria-label="Day title, tag and colour" onClick={() => onEditDay(day)}>
          <Icon name="edit" size={15} />
        </button>
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
        {maxToggle}
      </div>

      <div className="hours-scroll">
        <AllDayStrip day={day}>
          {allDay.map((x) => (
            <AllDayItem key={x.id} item={x} day={day} tagsOnRepeats={prefs.tagsOnRepeats} onOpen={onOpen} />
          ))}
        </AllDayStrip>

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

/** The strip above the hours. Dropping a timed entry here takes its time off but keeps it on the day. */
function AllDayStrip({ day, children }: { day: string; children: ReactNode[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'allday:' + day })
  return (
    <div ref={setNodeRef} className={`all-day${isOver ? ' is-over' : ''}`}>
      <span className="all-day-label">All day</span>
      <div className="all-day-items">
        {children}
        {children.length === 0 && <span className="all-day-empty">Drop an entry here to take its time off</span>}
      </div>
    </div>
  )
}

/** An untimed or multi-day entry. Drag it onto an hour to give it that start time. */
function AllDayItem({ item: x, day, tagsOnRepeats, onOpen }: { item: Item; day: string; tagsOnRepeats: boolean; onOpen: (item: Item) => void }) {
  const { itemStyle } = useLabels()
  const repeat = x.day !== day
  // Only the entry's first day can be dragged (later days of a stay are repeats).
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: repeat ? `${x.id}@${day}` : x.id, disabled: repeat })
  const s = itemStyle(x)
  const span = spanLabel(x, day)
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-disabled={undefined}
      className={`all-day-item${repeat ? ' is-repeat' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={{ background: s.color, color: onColor(s.color) }}
      onClick={() => onOpen(x)}
      title={repeat ? undefined : 'Drag onto an hour to set its time'}
    >
      <LabelIconView name={s.icon} size={16} />
      <b>{displayTitle(x)}</b>
      {span && <span className="all-day-span">{span}</span>}
      {(!repeat || tagsOnRepeats) && x.tags.length > 0 && (
        <span className="tag-row on-solid">
          <TagChips tags={x.tags} small />
        </span>
      )}
    </button>
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
        <span className="hour-event-time" style={{ color: inkColor(s.color) }}>
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

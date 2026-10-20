import { useDroppable } from '@dnd-kit/core'
import { inkColor, onColor } from '../colors'
import type { ReactNode } from 'react'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import { addDays, dayLabel, displayTitle, itemsForDay } from '../lib'
import { CardImage } from './CardImage'
import type { Item } from '../types'
import type { Prefs } from '../usePrefs'

const MAX_PER_DAY = 4
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  days: string[]
  items: Item[]
  prefs: Prefs
  selectedDay: string
  viewSwitch?: ReactNode
  maxToggle?: ReactNode
  /** Opens a day (the hour-by-hour view). */
  onOpenDay: (day: string) => void
  onOpen: (item: Item) => void
}

/** Monday-first weeks covering the whole trip. */
function weeksFor(days: string[]) {
  const first = days[0]
  const last = days[days.length - 1]
  const startOffset = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7
  let d = addDays(first, -startOffset)
  const weeks: string[][] = []
  while (d <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)))
    d = addDays(d, 7)
  }
  return weeks
}

export function MonthView({ days, items, prefs, selectedDay, viewSwitch, maxToggle, onOpenDay, onOpen }: Props) {
  const weeks = weeksFor(days)
  const inTrip = new Set(days)
  const months = [...new Set(days.map((d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })))]

  return (
    <section aria-label="Calendar" className="pane pane-month">
      <div className="pane-head">
        <h2>{months.join(' – ')}</h2>
        {viewSwitch}
        <span className="spacer" />
        {maxToggle}
      </div>
      <div className="month-scroll">
        <div className="month-grid" role="grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="month-dow" role="columnheader">
              {w}
            </div>
          ))}
          {weeks.flat().map((d) => (
            <MonthCell key={d} day={d} inTrip={inTrip.has(d)} selected={d === selectedDay} items={items} prefs={prefs} onOpenDay={onOpenDay} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  )
}

function MonthCell({ day, inTrip, selected, items, prefs, onOpenDay, onOpen }: { day: string; inTrip: boolean; selected: boolean; items: Item[]; prefs: Prefs; onOpenDay: (d: string) => void; onOpen: (i: Item) => void }) {
  const { itemStyle, dayStyle } = useLabels()
  const ds = dayStyle(day)
  const { setNodeRef, isOver } = useDroppable({ id: 'day:' + day, disabled: !inTrip })
  const list = inTrip ? itemsForDay(items, day).filter((x) => !prefs.hideRepeats || x.day === day) : []
  const l = dayLabel(day)
  const firstOfMonth = l.num === '1'
  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      className={`month-cell${inTrip ? '' : ' is-outside'}${selected ? ' is-selected' : ''}${isOver ? ' is-over' : ''}`}
      style={inTrip && ds.color ? { background: ds.bg!, boxShadow: `inset 0 4px 0 ${ds.color}` } : undefined}
    >
      <div className="month-cell-head">
        <button className="month-date" disabled={!inTrip} onClick={() => onOpenDay(day)} aria-label={`${l.dow} ${l.num} ${l.month}: open hour by hour`}>
          {firstOfMonth ? `${l.num} ${l.month}` : l.num}
        </button>
        {inTrip && (ds.title || ds.tag) && (
          <span className="month-day-title" style={ds.color ? { color: inkColor(ds.color) } : undefined}>
            {ds.title ?? ds.tag}
          </span>
        )}
      </div>
      <div className="month-items">
        {list.slice(0, MAX_PER_DAY).map((x) => {
          const s = itemStyle(x)
          const multi = !!(x.endDay && x.endDay !== x.day)
          return multi ? (
            <button
              key={x.id}
              className={`month-bar${x.day === day ? ' is-start' : ''}${x.endDay === day ? ' is-end' : ''}`}
              style={{ background: s.color, color: onColor(s.color) }}
              onClick={() => onOpen(x)}
              title={displayTitle(x)}
            >
              <LabelIconView name={s.icon} size={12} />
              <span>{displayTitle(x)}</span>
            </button>
          ) : (
            <button key={x.id} className="month-item" onClick={() => onOpen(x)} title={displayTitle(x)}>
              {x.imageUrl ? (
                <CardImage imageUrl={x.imageUrl} />
              ) : (
                <span className="month-icon" style={{ color: inkColor(s.color) }}>
                  <LabelIconView name={s.icon} size={13} />
                </span>
              )}
              {x.time && <span className="month-time">{x.time}</span>}
              <span className="month-title">{displayTitle(x)}</span>
            </button>
          )
        })}
        {list.length > MAX_PER_DAY && (
          <button className="month-more" onClick={() => onOpenDay(day)}>
            +{list.length - MAX_PER_DAY} more
          </button>
        )}
      </div>
    </div>
  )
}

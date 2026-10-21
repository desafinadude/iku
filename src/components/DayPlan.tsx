import { useEffect, useRef, type ReactNode } from 'react'
import { useSwipe } from '../useSwipe'
import { dayLabel, itemsForDay, onDay } from '../lib'
import { useLabels } from '../labels/LabelsContext'
import type { Attachment, Item, Member } from '../types'
import type { Prefs } from '../usePrefs'
import { DayColumn } from './DaysBoard'
import { Icon } from './Icon'

interface Props {
  tripName: string
  days: string[]
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  prefs: Prefs
  selectedDay: string
  unplannedCount: number
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  onShowIdeas: () => void
  onEditDay: (day: string) => void
  /** Adds a new entry on the day. */
  onAdd: (day: string) => void
  /** Sort and card-size controls. */
  controls?: ReactNode
}

/** Portrait (phone) view of a single day. */
export function DayPlan({ tripName, days, items, members, attachments, prefs, selectedDay, unplannedCount, onSelectDay, onOpen, onShowIdeas, onEditDay, onAdd, controls }: Props) {
  const { dayStyle } = useLabels()
  const today = itemsForDay(items, selectedDay, prefs.dayOrder).filter((x) => !prefs.hideRepeats || x.day === selectedDay)
  const index = days.indexOf(selectedDay)
  // Swipe left or right to go to the next or previous day; the day strip keeps the chosen day in view.
  const swipe = useSwipe(
    () => index > 0 && onSelectDay(days[index - 1]),
    () => index < days.length - 1 && onSelectDay(days[index + 1])
  )
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    strip.current?.querySelector('.day-pill.is-on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selectedDay])
  return (
    <section aria-label="Day plan" className="pane pane-dayplan" {...swipe}>
      <div className="dayplan-head">
        <div className="dayplan-title">
          <span className="muted small">
            {tripName} · Day {index + 1} of {days.length}
          </span>
          <span className="spacer" />
          {controls}
        </div>
        <div className="day-strip" ref={strip}>
          {days.map((d) => {
            const dl = dayLabel(d)
            const on = d === selectedDay
            const has = items.some((x) => onDay(x, d))
            const pd = dayStyle(d)
            // Each day's pill is tinted with the day's colour (the selected day stays dark).
            return (
              <button key={d} className={`day-pill${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onSelectDay(d)} style={pd.background && !on ? { background: pd.background, borderColor: pd.bg ?? 'transparent' } : undefined} title={pd.title ?? undefined}>
                <span className="small">{dl.dow}</span>
                <b>{dl.num}</b>
                <span className={`pill-dot${has ? ' has' : ''}`} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>
      {/* The same day column as on wide screens (its colours and the parts of the day), one day at a time. */}
      <DayColumn
        day={selectedDay}
        index={index}
        items={today}
        members={members}
        attachments={attachments}
        tagsOnRepeats={prefs.tagsOnRepeats}
        show={prefs.daysShow}
        selected={false}
        onSelect={() => onEditDay(selectedDay)}
        onOpen={onOpen}
        onAdd={() => onAdd(selectedDay)}
        onEdit={() => onEditDay(selectedDay)}
      />
      <button className="add-from-ideas" onClick={onShowIdeas}>
        <Icon name="plus" size={18} /> Add from Ideas ({unplannedCount})
      </button>
    </section>
  )
}

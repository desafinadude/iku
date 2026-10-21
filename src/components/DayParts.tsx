import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { onColor } from '../colors'
import { useLabels } from '../labels/LabelsContext'
import { addDays, DAY_PARTS, dayLabel, itemsForDay, partOf } from '../lib'
import type { Attachment, DayPart, Item, Member } from '../types'
import type { Prefs } from '../usePrefs'
import { useSwipe } from '../useSwipe'
import { Icon } from './Icon'
import { ItemCard } from './ItemCard'

interface Props {
  day: string
  days: string[]
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  prefs: Prefs
  viewSwitch?: ReactNode
  maxToggle?: ReactNode
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  /** Adds a new entry in a part of the day (null: All day). */
  onAdd: (day: string, part: DayPart | null) => void
  onEditDay: (day: string) => void
}

/** Stays and other multi-day entries, and entries with neither a time nor a part, go in "All day". */
const isAllDay = (x: Item, day: string) => !!(x.endDay && x.endDay !== x.day) || (!x.time && !x.part) || x.day !== day

/**
 * One day in loose blocks: All day, then Morning, Afternoon, Evening and Night. Timed entries sit in their block
 * with their time; others can be dropped into a block without committing to an hour.
 */
export function DayParts({ day, days, items, members, attachments, prefs, viewSwitch, maxToggle, onSelectDay, onOpen, onAdd, onEditDay }: Props) {
  const { dayStyle } = useLabels()
  const ds = dayStyle(day)
  const dayItems = itemsForDay(items, day, 'time').filter((x) => !prefs.hideRepeats || x.day === day)
  const allDay = dayItems.filter((x) => isAllDay(x, day))
  const l = dayLabel(day)
  const idx = days.indexOf(day)
  const swipe = useSwipe(
    () => idx > 0 && onSelectDay(addDays(day, -1)),
    () => idx < days.length - 1 && onSelectDay(addDays(day, 1))
  )
  const card = (x: Item, part: DayPart | null) => (
    <ItemCard
      key={x.id}
      item={x}
      members={members}
      variant="plan"
      day={day}
      part={part}
      show={prefs.daysShow}
      tagsOnRepeats={prefs.tagsOnRepeats}
      fileCount={attachments.filter((a) => a.itemId === x.id).length}
      onOpen={onOpen}
    />
  )

  return (
    <section aria-label="Day by parts" className="pane pane-parts" {...swipe}>
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
        <button className="icon-btn nav-btn" aria-label={`Previous day (this is day ${idx + 1} of ${days.length})`} disabled={idx <= 0} onClick={() => onSelectDay(addDays(day, -1))}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <button className="icon-btn nav-btn" aria-label="Next day" disabled={idx >= days.length - 1} onClick={() => onSelectDay(addDays(day, 1))}>
          <Icon name="chevronRight" size={18} />
        </button>
        {maxToggle}
      </div>

      {/* One planner page for the day, top to bottom, banded by part of the day. */}
      <div className="parts-scroll">
        <div className="planner">
          <PartBlock day={day} part={null} label="All day" hint="stays, no set time" onAdd={() => onAdd(day, null)}>
            {allDay.map((x) => card(x, null))}
          </PartBlock>
          {DAY_PARTS.map((p) => (
            <PartBlock key={p.id} day={day} part={p.id} label={p.label} hint={p.hint} onAdd={() => onAdd(day, p.id)}>
              {dayItems.filter((x) => !isAllDay(x, day) && partOf(x) === p.id).map((x) => card(x, p.id))}
            </PartBlock>
          ))}
        </div>
      </div>
    </section>
  )
}

/** A block of the day. Dropping an entry here puts it in this part (keeping an exact time that fits). */
function PartBlock({ day, part, label, hint, onAdd, children }: { day: string; part: DayPart | null; label: string; hint: string; onAdd: () => void; children: ReactNode[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `part:${day}:${part ?? 'none'}` })
  return (
    <div ref={setNodeRef} className={`part-band${part ? ' part-' + part : ' part-allday'}${isOver ? ' is-over' : ''}`}>
      <div className="part-side">
        <b>{label}</b>
        <span className="small">{hint}</span>
        <button type="button" className="icon-btn part-add" aria-label={`Add to ${label.toLowerCase()}`} onClick={onAdd}>
          <Icon name="plus" size={15} />
        </button>
      </div>
      <div className="part-items">{children}</div>
    </div>
  )
}

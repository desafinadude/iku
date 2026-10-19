import { useDroppable } from '@dnd-kit/core'
import { dayLabel, itemsForDay } from '../lib'
import type { Attachment, Item, Member } from '../types'
import { Icon } from './Icon'
import { ItemCard } from './ItemCard'

interface Props {
  days: string[]
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  selectedDay: string
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  onAdd: (day: string) => void
}

export function DaysBoard({ days, items, members, attachments, selectedDay, onSelectDay, onOpen, onAdd }: Props) {
  return (
    <section aria-label="Days" className="pane pane-days">
      <div className="pane-head">
        <h2>Days</h2>
        <span className="muted">Drag ideas onto a day</span>
      </div>
      <div className="day-columns">
        {days.map((day, i) => (
          <DayColumn
            key={day}
            day={day}
            index={i}
            items={itemsForDay(items, day)}
            members={members}
            attachments={attachments}
            selected={day === selectedDay}
            onSelect={() => onSelectDay(day)}
            onOpen={onOpen}
            onAdd={() => onAdd(day)}
          />
        ))}
      </div>
    </section>
  )
}

function DayColumn(props: {
  day: string
  index: number
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  selected: boolean
  onSelect: () => void
  onOpen: (item: Item) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'day:' + props.day })
  const l = dayLabel(props.day)
  return (
    <div ref={setNodeRef} className={`day-col${props.selected ? ' is-selected' : ''}${isOver ? ' is-over' : ''}`}>
      <button className="day-col-head" onClick={props.onSelect} aria-pressed={props.selected}>
        <span className="day-num">{l.num}</span>
        <span className="day-col-label">
          <b>{l.dow}</b>
          <span className="muted">Day {props.index + 1}</span>
        </span>
        <span className="muted small">{props.items.length ? `${props.items.length} stops` : 'Empty'}</span>
      </button>
      <div className="day-col-items">
        {props.items.map((item) => (
          <ItemCard key={item.id} item={item} members={props.members} variant="plan" day={props.day} fileCount={props.attachments.filter((a) => a.itemId === item.id).length} onOpen={props.onOpen} />
        ))}
        {props.items.length === 0 && <div className="drop-hint">Drop ideas here</div>}
        <button className="ghost-btn" onClick={props.onAdd}>
          <Icon name="plus" size={14} /> Add
        </button>
      </div>
    </div>
  )
}

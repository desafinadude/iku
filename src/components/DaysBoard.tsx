import { useDroppable } from '@dnd-kit/core'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import { dayLabel, itemsForDay } from '../lib'
import type { Prefs } from '../usePrefs'
import type { Attachment, Item, Member } from '../types'
import { Icon } from './Icon'
import { ItemCard } from './ItemCard'

interface Props {
  days: string[]
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  prefs: Prefs
  /** The Columns / Hours / Month switch. */
  viewSwitch: React.ReactNode
  selectedDay: string
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  onAdd: (day: string) => void
  onEditDay: (day: string) => void
}

export function DaysBoard({ days, items, members, attachments, prefs, viewSwitch, selectedDay, onSelectDay, onOpen, onAdd, onEditDay }: Props) {
  return (
    <section aria-label="Days" className="pane pane-days">
      <div className="pane-head">
        <h2>Days</h2>
        {viewSwitch}
        <span className="muted hide-narrow">Drag ideas onto a day</span>
      </div>
      <div className="day-columns">
        {days.map((day, i) => (
          <DayColumn
            key={day}
            day={day}
            index={i}
            items={itemsForDay(items, day).filter((x) => !prefs.hideRepeats || x.day === day)}
            tagsOnRepeats={prefs.tagsOnRepeats}
            members={members}
            attachments={attachments}
            selected={day === selectedDay}
            onSelect={() => onSelectDay(day)}
            onOpen={onOpen}
            onAdd={() => onAdd(day)}
            onEdit={() => onEditDay(day)}
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
  tagsOnRepeats: boolean
  selected: boolean
  onSelect: () => void
  onOpen: (item: Item) => void
  onAdd: () => void
  onEdit: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'day:' + props.day })
  const l = dayLabel(props.day)
  const { dayStyle, tagStyle } = useLabels()
  const ds = dayStyle(props.day)
  const tag = ds.tag ? tagStyle(ds.tag) : null
  return (
    <div
      ref={setNodeRef}
      className={`day-col${props.selected ? ' is-selected' : ''}${isOver ? ' is-over' : ''}${ds.color ? ' has-color' : ''}`}
      style={ds.color ? { background: ds.bg!, borderTopColor: ds.color } : undefined}
    >
      <div className="day-col-top">
        <button className="day-col-head" onClick={props.onSelect} aria-pressed={props.selected}>
          <span className="day-num" style={ds.color ? { color: ds.color } : undefined}>
            {l.num}
          </span>
          <span className="day-col-label">
            <b>
              {l.dow} <span className="muted">· Day {props.index + 1}</span>
            </b>
            <span className="day-title" style={ds.color ? { color: ds.color } : undefined}>
              {tag?.icon && <LabelIconView name={tag.icon} size={14} />}
              {ds.title ?? ds.tag ?? <span className="muted">{props.items.length ? `${props.items.length} stops` : 'Empty'}</span>}
            </span>
          </span>
        </button>
        <button className="icon-btn day-edit" aria-label={`Title and colour for ${l.dow} ${l.num}`} title="Day title, tag and colour" onClick={props.onEdit}>
          <Icon name="edit" size={15} />
        </button>
      </div>
      <div className="day-col-items">
        {props.items.map((item) => (
          <ItemCard key={item.id} item={item} members={props.members} variant="plan" day={props.day} tagsOnRepeats={props.tagsOnRepeats} fileCount={props.attachments.filter((a) => a.itemId === item.id).length} onOpen={props.onOpen} />
        ))}
        {props.items.length === 0 && <div className="drop-hint">Drop ideas here</div>}
        <button className="ghost-btn" onClick={props.onAdd}>
          <Icon name="plus" size={14} /> Add
        </button>
      </div>
    </div>
  )
}

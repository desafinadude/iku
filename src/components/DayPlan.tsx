import { dayLabel, itemsForDay, onDay, spanLabel } from '../lib'
import { TYPE_COLORS, type Attachment, type Item, type Member } from '../types'
import { Avatar, memberFor } from './Avatar'
import { Icon } from './Icon'

interface Props {
  tripName: string
  days: string[]
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  selectedDay: string
  unplannedCount: number
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
  onShowIdeas: () => void
}

/** Portrait (phone) view of a single day. */
export function DayPlan({ tripName, days, items, members, attachments, selectedDay, unplannedCount, onSelectDay, onOpen, onShowIdeas }: Props) {
  const today = itemsForDay(items, selectedDay)
  const l = dayLabel(selectedDay)
  const index = days.indexOf(selectedDay)
  return (
    <section aria-label="Day plan" className="pane pane-dayplan">
      <div className="dayplan-head">
        <span className="muted small">
          {tripName} · Day {index + 1} of {days.length}
        </span>
        <h1 className="display">
          {l.dow} {l.num} {l.month}
        </h1>
        <div className="day-strip">
          {days.map((d) => {
            const dl = dayLabel(d)
            const on = d === selectedDay
            const has = items.some((x) => onDay(x, d))
            return (
              <button key={d} className={`day-pill${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onSelectDay(d)}>
                <span className="small">{dl.dow}</span>
                <b>{dl.num}</b>
                <span className={`pill-dot${has ? ' has' : ''}`} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>
      <ol className="timeline">
        {today.map((item, i) => {
          const c = TYPE_COLORS[item.type]
          const creator = memberFor(members, item.createdBy)
          const span = spanLabel(item, selectedDay)
          const continuing = item.day !== selectedDay
          const files = attachments.filter((a) => a.itemId === item.id).length
          return (
            <li key={item.id}>
              <span className="tl-time">{continuing ? '' : (item.time ?? '—')}</span>
              <button className="tl-card" onClick={() => onOpen(item)}>
                <span className="tl-num" style={{ background: c.fg }}>
                  {i + 1}
                </span>
                <span className="tl-body">
                  <b>{item.title}</b>
                  {span && <span className="span-label">{span}</span>}
                  <span className="muted small">
                    {item.type}
                    {item.tags.length ? ' · ' + item.tags.join(' ') : ''}
                    {files > 0 && (
                      <span className="file-badge">
                        {' '}
                        <Icon name="paperclip" size={12} />
                        {files}
                      </span>
                    )}
                  </span>
                  {item.booked && (
                    <span className="tl-booking">
                      <Icon name="ticket" size={16} /> <b>Booked</b>
                      {item.bookingRef ? ' · ' + item.bookingRef : ''}
                    </span>
                  )}
                </span>
                {item.imageUrl && <img className="tl-thumb" src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                {creator && <Avatar member={creator} size={22} />}
              </button>
            </li>
          )
        })}
        {today.length === 0 && <p className="empty">Nothing planned yet.</p>}
      </ol>
      <button className="add-from-ideas" onClick={onShowIdeas}>
        <Icon name="plus" size={18} /> Add from Ideas ({unplannedCount})
      </button>
    </section>
  )
}

import type { ReactNode } from 'react'
import { inkColor, onColor } from '../colors'
import { dayLabel, displayTitle, isPhotoCard, itemsForDay, onDay, spanLabel } from '../lib'
import { CardImage } from './CardImage'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Attachment, Item, Member } from '../types'
import type { Prefs } from '../usePrefs'
import { TagChips } from './TagChips'
import { TagIcons } from './TagIcons'
import { Avatar, memberFor } from './Avatar'
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
  /** Sort and card-size controls. */
  controls?: ReactNode
}

/** Portrait (phone) view of a single day. */
export function DayPlan({ tripName, days, items, members, attachments, prefs, selectedDay, unplannedCount, onSelectDay, onOpen, onShowIdeas, onEditDay, controls }: Props) {
  const { itemStyle, dayStyle } = useLabels()
  const ds = dayStyle(selectedDay)
  const today = itemsForDay(items, selectedDay, prefs.dayOrder).filter((x) => !prefs.hideRepeats || x.day === selectedDay)
  const l = dayLabel(selectedDay)
  const index = days.indexOf(selectedDay)
  return (
    <section aria-label="Day plan" className="pane pane-dayplan">
      <div className="dayplan-head">
        <span className="muted small">
          {tripName} · Day {index + 1} of {days.length}
        </span>
        <div className="dayplan-title">
          <h1 className="display">
            {l.dow} {l.num} {l.month}
          </h1>
          <button className="icon-btn day-edit" aria-label="Day title, tag and colour" onClick={() => onEditDay(selectedDay)}>
            <Icon name="edit" size={16} />
          </button>
          <span className="spacer" />
          {controls}
        </div>
        {ds.image && (
          <div className="day-cover day-cover-phone">
            <CardImage imageUrl={ds.image} />
            {(ds.title || ds.tag) && <span className="day-cover-title">{ds.title ?? ds.tag}</span>}
          </div>
        )}
        {!ds.image && (ds.title || ds.tag) && (
          <span className="day-banner" style={ds.color ? { background: ds.color, color: onColor(ds.color) } : undefined}>
            {ds.title ?? ds.tag}
          </span>
        )}
        <div className="day-strip">
          {days.map((d) => {
            const dl = dayLabel(d)
            const on = d === selectedDay
            const has = items.some((x) => onDay(x, d))
            const pc = dayStyle(d).color
            return (
              <button key={d} className={`day-pill${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onSelectDay(d)} style={pc ? { boxShadow: `inset 0 -4px 0 ${pc}` } : undefined} title={dayStyle(d).title ?? undefined}>
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
          const c = itemStyle(item)
          const otherTags = item.tags.filter((t) => t !== c.name)
          const creator = memberFor(members, item.createdBy)
          const span = spanLabel(item, selectedDay)
          const continuing = item.day !== selectedDay
          const files = attachments.filter((a) => a.itemId === item.id).length
          // Which parts to show (the same choice as the day cards on wide screens).
          const show = prefs.daysShow
          const compact = !show.details
          const photo = !!item.imageUrl && !continuing && show.image
          const pictureOnly = photo && (isPhotoCard(item) || (!show.title && !show.details))
          return (
            <li key={item.id}>
              <span className="tl-time">{continuing ? '' : (item.time ?? '—')}</span>
              <button className={`tl-card${photo ? ' has-image' : ''}${compact ? ' is-compact' : ''}${show.tagIcons ? ' has-icons' : ''}`} onClick={() => onOpen(item)}>
                {show.tagIcons && <TagIcons tags={continuing && !prefs.tagsOnRepeats ? item.tags.slice(0, 1) : item.tags} />}
                {photo && <CardImage className={`tl-photo${pictureOnly ? ' is-whole' : ''}`} imageUrl={item.imageUrl!} />}
                <span className="tl-num" style={{ background: c.color, color: onColor(c.color) }}>
                  {i + 1}
                </span>
                <span className="tl-body">
                  {!pictureOnly && (show.title || !photo) && (
                    <b>
                      {item.pinned && (
                        <span className="pin-badge" aria-label="Pinned">
                          <Icon name="pushpin" size={12} strokeWidth={2.4} />
                        </span>
                      )}
                      {compact ? displayTitle(item) : item.title}
                    </b>
                  )}
                  {span && <span className="span-label">{span}</span>}
                  {!compact && (
                  <span className="muted small tl-type">
                    {c.name && (
                      <>
                        <span style={{ color: inkColor(c.color) }}>
                          <LabelIconView name={c.icon} size={13} />
                        </span>{' '}
                        {c.name}
                      </>
                    )}
                    {files > 0 && (
                      <span className="file-badge">
                        {' '}
                        <Icon name="paperclip" size={12} />
                        {files}
                      </span>
                    )}
                  </span>
                  )}
                  {show.tags && (!continuing || prefs.tagsOnRepeats) && otherTags.length > 0 && (
                    <span className="tag-row">
                      <TagChips tags={otherTags} small />
                    </span>
                  )}
                  {item.booked && !compact && (
                    <span className="tl-booking">
                      <Icon name="ticket" size={16} /> <b>Booked</b>
                      {item.bookingRef ? ' · ' + item.bookingRef : ''}
                    </span>
                  )}
                </span>
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

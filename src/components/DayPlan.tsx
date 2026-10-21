import { useEffect, useRef, type ReactNode } from 'react'
import { useSwipe } from '../useSwipe'
import { onColor } from '../colors'
import { bands, dayLabel, displayTitle, isPhotoCard, partLabel, itemsForDay, onDay, spanLabel } from '../lib'
import { CardImage } from './CardImage'
import { useLabels } from '../labels/LabelsContext'
import type { Attachment, Item, Member } from '../types'
import type { Prefs } from '../usePrefs'
import { TagChips } from './TagChips'
import { TagIcons } from './TagIcons'
import { PeopleBadges } from './PeopleBadges'
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
  let num = 0
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
        {(ds.title || ds.tag) && (
          <span className="day-banner" style={ds.color ? { background: ds.color, color: onColor(ds.color) } : undefined}>
            {ds.title ?? ds.tag}
          </span>
        )}
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
      {/* Numbered through the day, grouped under All day / Morning / Afternoon / Evening / Night. */}
      <ol className="timeline">
        {bands(today, selectedDay)
          .filter((g) => g.items.length)
          .flatMap((g) => [
            <li key={'band-' + (g.part ?? 'allday')} className={`tl-band ${g.part ? 'part-' + g.part : 'part-allday'}`}>
              {g.part ? partLabel(g.part) : 'All day'}
            </li>,
            ...g.items.map((item) => {
          if (item.chapter && item.day === selectedDay)
            return (
              <li key={item.id} className="tl-chapter">
                <button type="button" className={`chapter-face${item.imageUrl ? ' has-image' : ''}`} style={item.imageUrl ? undefined : { background: itemStyle(item).color, color: itemStyle(item).fg }} onClick={() => onOpen(item)}>
                  {item.imageUrl && <CardImage imageUrl={item.imageUrl} />}
                  <span className="chapter-text">
                    {(item.time || item.part) && <span className="card-time">{item.time ?? partLabel(item.part)}</span>}
                    <b>{displayTitle(item)}</b>
                    {item.note && <span className="chapter-note">{item.note}</span>}
                  </span>
                </button>
              </li>
            )
          const i = num++
          const c = itemStyle(item)
          const ordered = c.name ? [c.name, ...item.tags.filter((t) => t !== c.name)] : item.tags
          const span = spanLabel(item, selectedDay)
          const continuing = item.day !== selectedDay
          const rowTags = continuing && !prefs.tagsOnRepeats ? ordered.slice(0, c.name ? 1 : 0) : ordered
          const files = attachments.filter((a) => a.itemId === item.id).length
          // Which parts to show (the same choice as the day cards on wide screens).
          const show = prefs.daysShow
          const compact = !show.details
          const photo = !!item.imageUrl && !continuing && show.image
          const pictureOnly = photo && (isPhotoCard(item) || (!show.title && !show.details))
          return (
            <li key={item.id}>
              <span className="tl-time">{continuing ? '' : (item.time ?? partLabel(item.part) ?? '—')}</span>
              <button className={`tl-card${photo ? ' has-image' : ''}${compact ? ' is-compact' : ''}${show.tagIcons ? ' has-icons' : ''}`} onClick={() => onOpen(item)}>
                {show.tagIcons && <TagIcons tags={continuing && !prefs.tagsOnRepeats ? item.tags.slice(0, 1) : item.tags} people={continuing && !prefs.tagsOnRepeats ? [] : item.people} members={members} />}
                {photo && <CardImage className={`tl-photo${pictureOnly ? ' is-whole' : ''}`} imageUrl={item.imageUrl!} />}
                <span className="tl-num" style={{ background: c.color, color: c.fg }}>
                  {i + 1}
                </span>
                <span className="tl-body">
                  {!pictureOnly && (show.title || (!photo && !show.details && !show.tags && !show.tagIcons)) && (
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
                    {files > 0 && (
                      <span className="file-badge">
                        {' '}
                        <Icon name="paperclip" size={12} />
                        {files}
                      </span>
                    )}
                  </span>
                  )}
                  {/* Tags as solid chips (the colour tag first, in its icon colour), as on the cards; repeats keep just the colour tag. */}
                  {show.tags && (rowTags.length > 0 || (!continuing || prefs.tagsOnRepeats) && (item.people ?? []).length > 0) && (
                    <span className="tag-row">
                      <TagChips tags={rowTags} small />
                      <PeopleBadges people={item.people} members={members} small />
                    </span>
                  )}
                  {item.booked && !compact && (
                    <span className="tl-booking">
                      <Icon name="ticket" size={16} /> <b>Booked</b>
                      {item.bookingRef ? ' · ' + item.bookingRef : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })
          ])}
        {today.length === 0 && <p className="empty">Nothing planned yet.</p>}
      </ol>
      <button className="add-from-ideas" onClick={onShowIdeas}>
        <Icon name="plus" size={18} /> Add from Ideas ({unplannedCount})
      </button>
    </section>
  )
}

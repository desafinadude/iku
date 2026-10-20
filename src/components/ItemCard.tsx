import { useDraggable, useDroppable } from '@dnd-kit/core'
import { inkColor } from '../colors'
import { useContext, useState } from 'react'
import { DropHintContext, type CardZone } from '../dnd'
import { SHOW_ALL, type CardShow } from '../usePrefs'
import { TagIcons } from './TagIcons'
import { displayTitle, domainOf, isPhotoCard, spanLabel } from '../lib'
import { CardImage } from './CardImage'
import { useLabels } from '../labels/LabelsContext'
import type { Item, Member } from '../types'
import { Avatar, memberFor } from './Avatar'
import { Icon } from './Icon'
import { TagChips } from './TagChips'

interface Props {
  item: Item
  members: Member[]
  variant: 'pin' | 'plan'
  onOpen: (item: Item) => void
  draggable?: boolean
  /** The day column this card is shown in (for multi-day labels). */
  day?: string
  fileCount?: number
  /** Show tags on the repeated (later-day) cards of multi-day entries. */
  tagsOnRepeats?: boolean
  /** Highlighted as the one open beside the ideas board. */
  selected?: boolean
  /** Which parts of the card to show. */
  show?: CardShow
}

export function ItemCard({ item, members, variant, onOpen, draggable = true, day, fileCount = 0, tagsOnRepeats = false, selected = false, show = SHOW_ALL }: Props) {
  // A multi-day entry shows in several columns; only its first day's card can be dragged.
  const continuing = !!day && !!item.day && day !== item.day
  const span = day ? spanLabel(item, day) : null
  const creator = memberFor(members, item.createdBy)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: continuing ? `${item.id}@${day}` : item.id, disabled: !draggable || continuing })
  // Cards are drop targets too, so cards can be arranged by dropping one before or after another.
  const zone: CardZone = variant === 'pin' ? { zone: 'ideas' } : { zone: 'day', day: day ?? item.day ?? '' }
  const drop = useDroppable({ id: 'card:' + item.id, data: zone, disabled: !draggable || continuing })
  const hint = useContext(DropHintContext)
  const dropClass = drop.isOver && hint?.id === item.id ? (hint.after ? ' drop-after' : ' drop-before') : ''
  const { itemStyle } = useLabels()
  // The first coloured tag sets the card's colour; all tags sit in the bar at the bottom, that one first.
  const c = itemStyle(item)
  const ordered = c.name ? [c.name, ...item.tags.filter((t) => t !== c.name)] : item.tags
  // Repeat cards of multi-day entries keep just the colour tag unless "Show tags on repeats" is on.
  const shownTags = continuing && !tagsOnRepeats ? ordered.slice(0, c.name ? 1 : 0) : ordered
  const showCreator = !!creator && !continuing
  const domain = domainOf(item.url)
  const [imgBroken, setImgBroken] = useState(false)
  const image = show.image && item.imageUrl && !imgBroken ? item.imageUrl : null
  // Repeat day cards of multi-day entries never show the picture.
  const imageShown = !!image && !(variant === 'plan' && continuing)
  // Nothing but the picture (a photo with no title, or title and details turned off): show it whole, alone.
  const photoOnly = imageShown && (isPhotoCard(item) || (!show.title && !show.details))
  // A card is never empty: without a picture the title always shows.
  const titleShown = !photoOnly && (show.title || !imageShown)
  const time = variant === 'plan' && !!item.time && !continuing
  const fullMeta = show.details && (item.pinned || time || !!span || (variant === 'pin' && imageShown && !!domain) || fileCount > 0 || item.booked)
  const shortMeta = !show.details && titleShown && (item.pinned || time || !!span)
  const note = show.details && !!item.note && !continuing
  const compact = !show.details

  return (
    <article
      ref={(node) => {
        setNodeRef(node)
        drop.setNodeRef(node)
      }}
      className={`card ${variant === 'pin' ? 'card-pin' : 'card-plan'}${isDragging ? ' is-dragging' : ''}${continuing ? ' is-continuing' : ''}${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}${dropClass}`}
      {...listeners}
      {...attributes}
      // Repeat cards can't be dragged, but they still open: don't announce them as disabled.
      aria-disabled={undefined}
      role="button"
      tabIndex={0}
      aria-label={`${displayTitle(item)}${item.tags.length ? ', ' + item.tags.join(', ') : ''}${item.day ? '' : ', unplanned'}`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(item)
      }}
    >
      {show.tagIcons && <TagIcons tags={shownTags} />}
      {imageShown && (
        <div className={`card-photo${variant === 'plan' ? ' card-photo-plan' : ''}${photoOnly ? ' is-whole' : ''}`}>
          <CardImage imageUrl={image!} onBroken={() => setImgBroken(true)} />
        </div>
      )}
      {variant === 'pin' && !image && domain && show.image && show.details && (
        <div className="card-media" style={{ background: c.bg }}>
          <span className="card-domain" style={{ color: inkColor(c.color) }}>
            {domain}
          </span>
        </div>
      )}
      {(titleShown || fullMeta || shortMeta || note) && (
        <div className="card-body">
          {(fullMeta || shortMeta) && (
            <div className="card-meta">
              {item.pinned && (
                <span className="pin-badge" title="Pinned to the top" aria-label="Pinned">
                  <Icon name="pushpin" size={12} strokeWidth={2.4} />
                </span>
              )}
              {time && <span className="card-time">{item.time}</span>}
              {span && <span className="span-label">{span}</span>}
              {fullMeta && variant === 'pin' && imageShown && domain && <span className="card-domain">{domain}</span>}
              {fullMeta && fileCount > 0 && (
                <span className="file-badge" aria-label={`${fileCount} attachments`}>
                  <Icon name="paperclip" size={13} />
                  {fileCount}
                </span>
              )}
              {fullMeta && item.booked && (
                <span className="booked">
                  <Icon name="check" size={13} strokeWidth={2.4} />
                  Booked
                </span>
              )}
            </div>
          )}
          {titleShown && <div className="card-title">{displayTitle(item)}</div>}
          {note && <div className="card-note">{item.note}</div>}
        </div>
      )}
      {photoOnly && show.details && fileCount > 0 && (
        <div className="card-meta card-meta-photo">
          <span className="file-badge" aria-label={`${fileCount} attachments`}>
            <Icon name="paperclip" size={13} />
            {fileCount}
          </span>
        </div>
      )}
      {show.tags && (shownTags.length > 0 || showCreator) && (
        <div className="card-foot">
          <TagChips tags={shownTags} small />
          {showCreator && (
            <span className="card-creator">
              <Avatar member={creator!} size={20} />
            </span>
          )}
        </div>
      )}
    </article>
  )
}

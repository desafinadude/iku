import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
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
}

export function ItemCard({ item, members, variant, onOpen, draggable = true, day, fileCount = 0, tagsOnRepeats = false, selected = false }: Props) {
  // A multi-day entry shows in several columns; only its first day's card can be dragged.
  const continuing = !!day && !!item.day && day !== item.day
  const span = day ? spanLabel(item, day) : null
  const creator = memberFor(members, item.createdBy)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: continuing ? `${item.id}@${day}` : item.id, disabled: !draggable || continuing })
  const { itemStyle } = useLabels()
  // The first coloured tag sets the card's colour; all tags sit in the bar at the bottom, that one first.
  const c = itemStyle(item)
  const ordered = c.name ? [c.name, ...item.tags.filter((t) => t !== c.name)] : item.tags
  // Repeat cards of multi-day entries keep just the colour tag unless "Show tags on repeats" is on.
  const shownTags = continuing && !tagsOnRepeats ? ordered.slice(0, c.name ? 1 : 0) : ordered
  const showCreator = !!creator && !continuing
  const domain = domainOf(item.url)
  const [imgBroken, setImgBroken] = useState(false)
  const image = item.imageUrl && !imgBroken ? item.imageUrl : null
  // A picture with no title: show the whole image, uncropped.
  const photoOnly = isPhotoCard(item) && !!image

  return (
    <article
      ref={setNodeRef}
      className={`card ${variant === 'pin' ? 'card-pin' : 'card-plan'}${isDragging ? ' is-dragging' : ''}${continuing ? ' is-continuing' : ''}${selected ? ' is-selected' : ''}`}
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
      {variant === 'plan' && image && !continuing && (
        <div className={`card-photo card-photo-plan${photoOnly ? ' is-whole' : ''}`}>
          <CardImage imageUrl={image} onBroken={() => setImgBroken(true)} />
        </div>
      )}
      {variant === 'pin' && image && (
        <div className={`card-photo${photoOnly ? ' is-whole' : ''}`}>
          <CardImage imageUrl={image} onBroken={() => setImgBroken(true)} />
        </div>
      )}
      {variant === 'pin' && !image && domain && (
        <div className="card-media" style={{ background: c.bg }}>
          <span className="card-domain" style={{ color: c.color }}>
            {domain}
          </span>
        </div>
      )}
      {!(photoOnly && variant === 'pin') && (
        <div className="card-body">
          {((variant === 'plan' && item.time && !continuing) || span || (variant === 'pin' && image && domain) || fileCount > 0 || item.booked) && (
            <div className="card-meta">
              {variant === 'plan' && item.time && !continuing && <span className="card-time">{item.time}</span>}
              {span && <span className="span-label">{span}</span>}
              {variant === 'pin' && image && domain && <span className="card-domain">{domain}</span>}
              {fileCount > 0 && (
                <span className="file-badge" aria-label={`${fileCount} attachments`}>
                  <Icon name="paperclip" size={13} />
                  {fileCount}
                </span>
              )}
              {item.booked && (
                <span className="booked">
                  <Icon name="check" size={13} strokeWidth={2.4} />
                  Booked
                </span>
              )}
            </div>
          )}
          {!photoOnly && <div className="card-title">{item.title}</div>}
          {item.note && !continuing && <div className="card-note">{item.note}</div>}
        </div>
      )}
      {photoOnly && variant === 'pin' && fileCount > 0 && (
        <div className="card-meta card-meta-photo">
          <span className="file-badge" aria-label={`${fileCount} attachments`}>
            <Icon name="paperclip" size={13} />
            {fileCount}
          </span>
        </div>
      )}
      {(shownTags.length > 0 || showCreator) && (
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

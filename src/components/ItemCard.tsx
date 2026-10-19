import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import { domainOf, spanLabel } from '../lib'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
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
}

export function ItemCard({ item, members, variant, onOpen, draggable = true, day, fileCount = 0, tagsOnRepeats = false }: Props) {
  // A multi-day entry shows in several columns; only its first day's card can be dragged.
  const continuing = !!day && !!item.day && day !== item.day
  const span = day ? spanLabel(item, day) : null
  const creator = memberFor(members, item.createdBy)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: continuing ? `${item.id}@${day}` : item.id, disabled: !draggable || continuing })
  const { typeStyle } = useLabels()
  const c = typeStyle(item.type)
  const domain = domainOf(item.url)
  const [imgBroken, setImgBroken] = useState(false)
  const image = item.imageUrl && !imgBroken ? item.imageUrl : null

  return (
    <article
      ref={setNodeRef}
      className={`card ${variant === 'pin' ? 'card-pin' : 'card-plan'}${isDragging ? ' is-dragging' : ''}${continuing ? ' is-continuing' : ''}`}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`${item.title}, ${item.type}${item.day ? '' : ', unplanned'}`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(item)
      }}
    >
      {variant === 'plan' && image && !continuing && (
        <div className="card-photo card-photo-plan">
          <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} onError={() => setImgBroken(true)} />
        </div>
      )}
      {variant === 'pin' && image && (
        <div className="card-photo">
          <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} onError={() => setImgBroken(true)} />
          {domain && <span className="card-domain card-domain-over">{domain}</span>}
        </div>
      )}
      {variant === 'pin' && !image && domain && (
        <div className="card-media" style={{ background: c.bg }}>
          <span className="card-domain" style={{ color: c.color }}>
            {domain}
          </span>
        </div>
      )}
      <div className="card-body">
        <div className="card-meta">
          {variant === 'plan' && item.time && !continuing && <span className="card-time">{item.time}</span>}
          {span && <span className="span-label">{span}</span>}
          <span className="type-label" style={{ color: c.color, background: variant === 'plan' ? c.bg : undefined }}>
            <LabelIconView name={c.icon} size={12} />
            {item.type}
          </span>
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
        <div className="card-title">{item.title}</div>
        {item.note && !continuing && <div className="card-note">{item.note}</div>}
        {(!continuing || (tagsOnRepeats && item.tags.length > 0)) && (item.tags.length > 0 || creator) && (
          <div className="tag-row">
            <TagChips tags={item.tags} small={continuing} />
            {creator && !continuing && (
              <span className="card-creator">
                <Avatar member={creator} size={20} />
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

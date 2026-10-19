import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import { domainOf, spanLabel } from '../lib'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Item, Member } from '../types'
import { Avatar, memberFor } from './Avatar'
import { Icon } from './Icon'

interface Props {
  item: Item
  members: Member[]
  variant: 'pin' | 'plan'
  onOpen: (item: Item) => void
  draggable?: boolean
  /** The day column this card is shown in (for multi-day labels). */
  day?: string
  fileCount?: number
}

export function ItemCard({ item, members, variant, onOpen, draggable = true, day, fileCount = 0 }: Props) {
  // A multi-day entry shows in several columns; only its first day's card can be dragged.
  const continuing = !!day && !!item.day && day !== item.day
  const span = day ? spanLabel(item, day) : null
  const creator = memberFor(members, item.createdBy)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: continuing ? `${item.id}@${day}` : item.id, disabled: !draggable || continuing })
  const { typeStyle, tagStyle } = useLabels()
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
        {variant === 'plan' && image ? (
          <div className="card-title-row">
            <div className="card-title">{item.title}</div>
            <img className="card-thumb" src={image} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} onError={() => setImgBroken(true)} />
          </div>
        ) : (
          <div className="card-title">{item.title}</div>
        )}
        {item.note && !continuing && <div className="card-note">{item.note}</div>}
        {!continuing && (item.tags.length > 0 || creator) && (
          <div className="tag-row">
            {item.tags.map((t) => {
              const st = tagStyle(t)
              return (
                <span key={t} className="tag" style={st.color ? { background: st.bg!, color: st.color } : undefined}>
                  {st.icon && <LabelIconView name={st.icon} size={11} />}
                  {t}
                </span>
              )
            })}
            {creator && (
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

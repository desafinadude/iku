import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import { domainOf } from '../lib'
import { TYPE_COLORS, type Item, type Member } from '../types'
import { Avatar, memberFor } from './Avatar'
import { Icon } from './Icon'

interface Props {
  item: Item
  members: Member[]
  variant: 'pin' | 'plan'
  onOpen: (item: Item) => void
  draggable?: boolean
}

export function ItemCard({ item, members, variant, onOpen, draggable = true }: Props) {
  const creator = memberFor(members, item.createdBy)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: !draggable })
  const c = TYPE_COLORS[item.type]
  const domain = domainOf(item.url)
  const [imgBroken, setImgBroken] = useState(false)
  const image = item.imageUrl && !imgBroken ? item.imageUrl : null

  return (
    <article
      ref={setNodeRef}
      className={`card ${variant === 'pin' ? 'card-pin' : 'card-plan'}${isDragging ? ' is-dragging' : ''}`}
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
          <span className="card-domain" style={{ color: c.fg }}>
            {domain}
          </span>
        </div>
      )}
      <div className="card-body">
        <div className="card-meta">
          {variant === 'plan' && item.time && <span className="card-time">{item.time}</span>}
          <span className="type-label" style={{ color: c.fg, background: variant === 'plan' ? c.bg : undefined }}>
            {variant === 'pin' && <span className="dot" style={{ background: c.fg }} />}
            {item.type}
          </span>
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
        {item.note && <div className="card-note">{item.note}</div>}
        {(item.tags.length > 0 || creator) && (
          <div className="tag-row">
            {item.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
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

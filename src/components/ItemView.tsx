import { Fragment, useState } from 'react'
import { dayLabel, daysBetween, displayTitle, domainOf, isStay, shortDate } from '../lib'
import { directionsUrl, googleMapsUrl, useGoogleOk } from '../maps/config'
import type { Attachment, Item, Member } from '../types'
import { AttachmentList } from './AttachmentList'
import { Avatar, memberFor } from './Avatar'
import { CardImage } from './CardImage'
import { Icon } from './Icon'
import { PlaceInfo } from './PlaceInfo'
import { TagChips } from './TagChips'

interface Props {
  item: Item
  members: Member[]
  attachments: Attachment[]
  offlineIds: Set<string>
  onOpenFile: (a: Attachment) => void
  onToggleOffline: (a: Attachment) => void
  onViewImage: () => void
}

/** "Tue 13 Apr · 10:30–12:30", "Mon 12 → Wed 14 Apr · 2 nights", or "Unplanned idea". */
export function whenText(item: Item) {
  if (!item.day) return 'Unplanned idea'
  const a = dayLabel(item.day)
  const start = `${a.dow} ${a.num} ${a.month}`
  if (item.endDay && item.endDay !== item.day) {
    const b = dayLabel(item.endDay)
    const n = daysBetween(item.day, item.endDay)
    const span = isStay(item) ? `${n} ${n === 1 ? 'night' : 'nights'}` : `${n + 1} days`
    return `${a.dow} ${a.num} → ${b.dow} ${b.num} ${b.month} · ${span}${item.time ? ` · from ${item.time}` : ''}`
  }
  return `${start}${item.time ? ` · ${item.time}${item.endTime ? `–${item.endTime}` : ''}` : ''}`
}

/** Turns URLs in a note into links. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer">
            {domainOf(p) ?? p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  )
}

/** An entry, read-only: what you need on the day, without edit controls. */
export function ItemView({ item, members, attachments, offlineIds, onOpenFile, onToggleOffline, onViewImage }: Props) {
  const googleOk = useGoogleOk()
  const [imgOk, setImgOk] = useState(true)
  const creator = memberFor(members, item.createdBy)
  const domain = domainOf(item.url)
  const located = item.lat != null && item.lng != null

  return (
    <article className="item-view">
      {item.imageUrl && imgOk && (
        <button type="button" className="view-image" onClick={onViewImage} aria-label="View image full screen">
          <CardImage imageUrl={item.imageUrl} loading="eager" onBroken={() => setImgOk(false)} />
        </button>
      )}
      <div className="view-head">
        <h2 className="view-title">{displayTitle(item)}</h2>
        {item.tags.length > 0 && (
          <div className="tag-row">
            <TagChips tags={item.tags} />
          </div>
        )}
      </div>

      <dl className="view-facts">
        <div>
          <dt>
            <Icon name="days" size={16} />
            <span className="sr-only">When</span>
          </dt>
          <dd>{whenText(item)}</dd>
        </div>
        {item.booked && (
          <div>
            <dt>
              <Icon name="ticket" size={16} />
              <span className="sr-only">Booking</span>
            </dt>
            <dd>
              <b>Booked</b>
              {item.bookingRef ? ` · ${item.bookingRef}` : ''}
            </dd>
          </div>
        )}
        {(item.place || located) && (
          <div>
            <dt>
              <Icon name="pin" size={16} />
              <span className="sr-only">Place</span>
            </dt>
            <dd>{item.place ?? `${item.lat!.toFixed(4)}, ${item.lng!.toFixed(4)}`}</dd>
          </div>
        )}
        {domain && (
          <div>
            <dt>
              <Icon name="link" size={16} />
              <span className="sr-only">Link</span>
            </dt>
            <dd>
              <a href={item.url!} target="_blank" rel="noreferrer">
                {domain}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {googleOk && item.placeId && <PlaceInfo placeId={item.placeId} />}
      {located && (
        <div className="maps-links">
          <a className="secondary-btn" href={googleMapsUrl({ name: item.place, lat: item.lat, lng: item.lng, placeId: item.placeId || null })!} target="_blank" rel="noreferrer">
            <Icon name="map" size={16} /> Google Maps
          </a>
          <a className="secondary-btn" href={directionsUrl({ lat: item.lat, lng: item.lng, placeId: item.placeId || null })!} target="_blank" rel="noreferrer">
            <Icon name="external" size={16} /> Directions
          </a>
        </div>
      )}

      {item.note && (
        <p className="view-note">
          <Linkified text={item.note} />
        </p>
      )}

      {attachments.length > 0 && (
        <div className="group">
          <h3 className="group-title">Attachments</h3>
          <AttachmentList attachments={attachments} members={members} offlineIds={offlineIds} canAdd={false} readOnly onAdd={() => {}} onOpen={onOpenFile} onDelete={() => {}} onToggleOffline={onToggleOffline} />
        </div>
      )}

      {creator && (
        <div className="byline">
          <Avatar member={creator} size={24} />
          <span className="small">
            Added by <b>{creator.name || creator.email.split('@')[0]}</b> · {shortDate(item.createdAt)}
          </span>
        </div>
      )}
    </article>
  )
}

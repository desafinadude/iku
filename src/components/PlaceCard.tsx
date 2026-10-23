import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'
import { dayLabel, displayTitle, partLabel } from '../lib'
import { directionsUrl, googleMapsUrl, useGoogleOk } from '../maps/config'
import type { FoundPlace } from '../maps/places'
import type { Item } from '../types'
import { CardImage } from './CardImage'
import { Icon } from './Icon'
import { TagChips } from './TagChips'

interface GoogleDetails {
  name: string
  kind: string | null
  price: string | null
  rating: number | null
  ratings: number | null
  openNow: boolean | null
  today: string | null
  week: string[]
  address: string | null
  phone: string | null
  website: string | null
  mapsUrl: string | null
  summary: string | null
  photos: string[]
  lat: number | null
  lng: number | null
}

const PRICE: Record<string, string> = { FREE: 'Free', INEXPENSIVE: 'Inexpensive', MODERATE: 'Moderate prices', EXPENSIVE: 'Expensive', VERY_EXPENSIVE: 'Very expensive' }

/** Everything Google knows about a place that's worth showing on a card. */
function useGoogleDetails(placeId: string | null) {
  const places = useMapsLibrary('places')
  const googleOk = useGoogleOk()
  const [d, setD] = useState<GoogleDetails | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setD(null)
    if (!places || !placeId || !googleOk) return
    let live = true
    setBusy(true)
    const place = new places.Place({ id: placeId })
    place
      .fetchFields({
        fields: ['displayName', 'primaryTypeDisplayName', 'priceLevel', 'rating', 'userRatingCount', 'regularOpeningHours', 'utcOffsetMinutes', 'formattedAddress', 'nationalPhoneNumber', 'websiteURI', 'googleMapsURI', 'editorialSummary', 'photos', 'location']
      })
      .then(async () => {
        let openNow: boolean | null = null
        try {
          openNow = (await place.isOpen()) ?? null
        } catch {
          /* no hours */
        }
        if (!live) return
        // weekdayDescriptions starts on Monday.
        const idx = (new Date().getDay() + 6) % 7
        const week = place.regularOpeningHours?.weekdayDescriptions ?? []
        setD({
          name: place.displayName ?? '',
          kind: place.primaryTypeDisplayName ?? null,
          price: place.priceLevel ? (PRICE[String(place.priceLevel)] ?? null) : null,
          rating: place.rating ?? null,
          ratings: place.userRatingCount ?? null,
          openNow,
          today: week[idx]?.replace(/^[^:]+:\s*/, '') ?? null,
          week,
          address: place.formattedAddress ?? null,
          phone: place.nationalPhoneNumber ?? null,
          website: place.websiteURI ?? null,
          mapsUrl: place.googleMapsURI ?? null,
          summary: place.editorialSummary ?? null,
          photos: (place.photos ?? []).slice(0, 6).map((p) => p.getURI({ maxWidth: 800 })),
          lat: place.location?.lat() ?? null,
          lng: place.location?.lng() ?? null
        })
      })
      .catch(() => live && setD(null))
      .finally(() => live && setBusy(false))
    return () => {
      live = false
    }
  }, [places, placeId, googleOk])
  return { d, busy }
}

function Stars({ rating, count }: { rating: number; count: number | null }) {
  return (
    <span className="pc-rating" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      <b>{rating.toFixed(1)}</b>
      <span className="pc-stars" aria-hidden="true" style={{ ['--fill' as string]: `${(rating / 5) * 100}%` }}>
        ★★★★★
      </span>
      {count != null && <span className="muted">({count.toLocaleString()})</span>}
    </span>
  )
}

interface Props {
  /** One of the trip's entries, or null for a place tapped on the map. */
  entry: Item | null
  placeId: string | null
  days: string[]
  /** "2 of 6" and arrows, when stepping through the day's stops. */
  position?: { index: number; total: number; onPrev: () => void; onNext: () => void }
  onOpen: (item: Item) => void
  /** Saves a tapped place as a new idea. */
  onSave: (place: FoundPlace) => Promise<void>
  onClose: () => void
}

/** A Google Maps-style card for a pin: photos, rating, hours, address and links, plus the entry's own details. */
export function PlaceCard({ entry, placeId, days, position, onOpen, onSave, onClose }: Props) {
  const { d, busy } = useGoogleDetails(placeId)
  const [showWeek, setShowWeek] = useState(false)
  const [saving, setSaving] = useState<'idle' | 'busy' | 'done'>('idle')
  useEffect(() => {
    setShowWeek(false)
    setSaving('idle')
  }, [entry?.id, placeId])

  const photos = [...(entry?.imageUrl ? [entry.imageUrl] : []), ...(d?.photos ?? [])]
  const title = entry ? displayTitle(entry) : (d?.name ?? '')
  const lat = entry?.lat ?? d?.lat ?? null
  const lng = entry?.lng ?? d?.lng ?? null
  const address = d?.address ?? entry?.place ?? null
  const when = entry?.day
    ? (() => {
        const l = dayLabel(entry.day)
        const time = entry.time ? `${entry.time}${entry.endTime ? `–${entry.endTime}` : ''}` : partLabel(entry.part)
        return `Day ${days.indexOf(entry.day) + 1} · ${l.dow} ${l.num} ${l.month}${time ? ` · ${time}` : ''}`
      })()
    : entry
      ? 'Idea (not on the plan yet)'
      : null
  const maps = d?.mapsUrl ?? googleMapsUrl({ name: entry?.place ?? title, lat, lng, placeId })
  const directions = directionsUrl({ lat, lng, placeId })

  if (!entry && !d) {
    return (
      <div className="place-card is-loading" role="dialog" aria-label="Place">
        <button type="button" className="icon-btn pc-close" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
        <p className="muted small">{busy ? 'Loading place…' : 'No details for this place.'}</p>
      </div>
    )
  }

  return (
    <div className="place-card" role="dialog" aria-label={title}>
      <button type="button" className="icon-btn pc-close" aria-label="Close" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
      {photos.length > 0 && (
        <div className="pc-photos">
          {photos.map((src, i) => (
            <CardImage key={src + i} imageUrl={src} />
          ))}
        </div>
      )}
      <div className="pc-body">
        <h3 className="pc-title">{title}</h3>
        {(d?.kind || d?.price || d?.rating != null) && (
          <div className="pc-line">
            {d?.rating != null && <Stars rating={d.rating} count={d.ratings} />}
            {[d?.kind, d?.price].filter(Boolean).join(' · ') && <span className="muted">{[d?.kind, d?.price].filter(Boolean).join(' · ')}</span>}
          </div>
        )}
        {when && <div className="pc-when">{when}</div>}
        {entry && (entry.tags.length > 0) && (
          <div className="pc-tags">
            <TagChips tags={entry.tags} small />
          </div>
        )}
        {(d?.openNow != null || d?.today) && (
          <div className="pc-hours">
            <button type="button" className="link-btn" onClick={() => setShowWeek((v) => !v)} aria-expanded={showWeek}>
              {d.openNow != null && <b className={d.openNow ? 'pc-open' : 'pc-closed'}>{d.openNow ? 'Open now' : 'Closed now'}</b>}
              {d.today && <span> · Today {d.today}</span>}
              {d.week.length > 0 && <Icon name="chevronDown" size={14} />}
            </button>
            {showWeek && (
              <ul className="pc-week">
                {d.week.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {d?.summary && <p className="pc-summary">{d.summary}</p>}
        {entry?.note && <p className="pc-note">{entry.note}</p>}
        {address && (
          <div className="pc-row">
            <Icon name="pin" size={15} /> <span>{address}</span>
          </div>
        )}
        {d?.phone && (
          <div className="pc-row">
            <Icon name="phone" size={15} /> <a href={`tel:${d.phone.replace(/\s/g, '')}`}>{d.phone}</a>
          </div>
        )}
        {d?.website && (
          <div className="pc-row">
            <Icon name="link" size={15} />{' '}
            <a href={d.website} target="_blank" rel="noreferrer">
              {d.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </div>
        )}
        <div className="pc-actions">
          {entry ? (
            <button type="button" className="primary-btn" onClick={() => onOpen(entry)}>
              Open entry
            </button>
          ) : (
            d &&
            placeId &&
            lat != null &&
            lng != null && (
              <button
                type="button"
                className="primary-btn"
                disabled={saving !== 'idle'}
                onClick={async () => {
                  setSaving('busy')
                  try {
                    await onSave({ name: d.name, address: d.address, lat, lng, placeId, photo: d.photos[0] ?? null })
                    setSaving('done')
                  } catch {
                    setSaving('idle')
                  }
                }}
              >
                <Icon name={saving === 'done' ? 'check' : 'plus'} size={16} /> {saving === 'done' ? 'Saved to Ideas' : saving === 'busy' ? 'Saving…' : 'Save as idea'}
              </button>
            )
          )}
          {directions && (
            <a className="secondary-btn" href={directions} target="_blank" rel="noreferrer">
              <Icon name="external" size={15} /> Directions
            </a>
          )}
          {maps && (
            <a className="secondary-btn" href={maps} target="_blank" rel="noreferrer">
              <Icon name="map" size={15} /> Google Maps
            </a>
          )}
        </div>
        {position && position.total > 1 && (
          <div className="pc-nav">
            <button type="button" className="icon-btn" aria-label="Previous stop" disabled={position.index === 0} onClick={position.onPrev}>
              <Icon name="chevronLeft" size={18} />
            </button>
            <span className="muted small">
              Stop {position.index + 1} of {position.total}
            </span>
            <button type="button" className="icon-btn" aria-label="Next stop" disabled={position.index === position.total - 1} onClick={position.onNext}>
              <Icon name="chevronRight" size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

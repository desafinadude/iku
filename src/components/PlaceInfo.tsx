import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'

interface Details {
  rating: number | null
  ratings: number | null
  today: string | null
  website: string | null
  phone: string | null
  address: string | null
}

/** Live details for a Google place (rating, today's hours, website, phone). Needs the Google key. */
export function PlaceInfo({ placeId }: { placeId: string }) {
  const places = useMapsLibrary('places')
  const [d, setD] = useState<Details | null>(null)

  useEffect(() => {
    if (!places) return
    let live = true
    const place = new places.Place({ id: placeId })
    place
      .fetchFields({ fields: ['rating', 'userRatingCount', 'regularOpeningHours', 'websiteURI', 'nationalPhoneNumber', 'formattedAddress'] })
      .then(() => {
        if (!live) return
        // weekdayDescriptions starts on Monday.
        const idx = (new Date().getDay() + 6) % 7
        setD({
          rating: place.rating ?? null,
          ratings: place.userRatingCount ?? null,
          today: place.regularOpeningHours?.weekdayDescriptions?.[idx] ?? null,
          website: place.websiteURI ?? null,
          phone: place.nationalPhoneNumber ?? null,
          address: place.formattedAddress ?? null
        })
      })
      .catch(() => live && setD(null))
    return () => {
      live = false
    }
  }, [places, placeId])

  if (!d) return null
  return (
    <div className="place-info">
      {d.rating != null && (
        <span className="place-rating" aria-label={`Rated ${d.rating} out of 5`}>
          <span aria-hidden="true">★</span> {d.rating.toFixed(1)}
          {d.ratings != null && <span className="muted"> ({d.ratings.toLocaleString()})</span>}
        </span>
      )}
      {d.address && <span className="muted small">{d.address}</span>}
      {d.today && <span className="small">{d.today}</span>}
      <span className="place-links small">
        {d.website && (
          <a href={d.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
        {d.phone && <a href={`tel:${d.phone.replace(/\s/g, '')}`}>{d.phone}</a>}
      </span>
    </div>
  )
}

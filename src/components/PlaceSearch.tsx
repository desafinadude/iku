import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface PlaceHit {
  name: string
  detail: string
  lat: number
  lng: number
}

interface Props {
  value: string
  lat: number | null
  lng: number | null
  /** Results near this point rank first (e.g. the middle of the trip's stops). */
  near: { lat: number; lng: number } | null
  onChange: (place: string | null) => void
  onPick: (hit: PlaceHit) => void
  onClearLocation: () => void
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

// Photon (komoot) is built for search-as-you-type over OpenStreetMap data. Nominatim's
// usage policy doesn't allow autocomplete, so we don't use it here.
async function searchPlaces(q: string, near: Props['near'], signal: AbortSignal): Promise<PlaceHit[]> {
  const params = new URLSearchParams({ q, limit: '6', lang: 'en' })
  if (near) {
    params.set('lat', String(near.lat))
    params.set('lon', String(near.lng))
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  const body = (await res.json()) as { features: PhotonFeature[] }
  const seen = new Set<string>()
  return body.features
    .map((f) => {
      const p = f.properties
      const name = p.name ?? [p.housenumber, p.street].filter(Boolean).join(' ') ?? ''
      const detail = [p.name ? [p.street, p.housenumber].filter(Boolean).join(' ') : '', p.district, p.city ?? p.county, p.country].filter(Boolean).join(', ')
      return { name, detail, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }
    })
    .filter((h) => {
      const key = `${h.name}|${h.lat.toFixed(4)}|${h.lng.toFixed(4)}`
      if (!h.name || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function PlaceSearch({ value, lat, lng, near, onChange, onPick, onClearLocation }: Props) {
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'idle' | 'busy' | 'none' | 'error'>('idle')
  const typed = useRef(false)
  const listRef = useRef<HTMLUListElement>(null)

  // Suggestions open below the field, which can be off-screen in a scrolled sheet.
  useEffect(() => {
    if (open && hits.length) listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open, hits])

  useEffect(() => {
    const q = value.trim()
    if (!typed.current || q.length < 3) {
      setHits([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setState('busy')
      try {
        const found = await searchPlaces(q, near, ctrl.signal)
        setHits(found)
        setOpen(true)
        setState(found.length ? 'idle' : 'none')
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setState('error')
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value, near])

  return (
    <div className="field place-search">
      <label htmlFor="f-place">Place</label>
      <div className="place-input">
        <Icon name="search" size={16} />
        <input
          id="f-place"
          placeholder="Search for a place or address"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            typed.current = true
            onChange(e.target.value || null)
          }}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        />
        {state === 'busy' && <span className="muted small">Searching…</span>}
      </div>
      {open && hits.length > 0 && (
        <ul ref={listRef} className="place-hits" role="listbox" aria-label="Places">
          {hits.map((h) => (
            <li key={`${h.name}-${h.lat}-${h.lng}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  typed.current = false
                  setOpen(false)
                  setHits([])
                  onPick(h)
                }}
              >
                <Icon name="pin" size={16} />
                <span>
                  <b>{h.name}</b>
                  {h.detail && <span className="muted small">{h.detail}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <span className="muted small place-status">
        {state === 'none' && open
          ? 'No matches. Try adding the city.'
          : state === 'error'
            ? 'Place search isn’t available right now.'
            : lat != null && lng != null
              ? (
                  <>
                    On the map ({lat.toFixed(4)}, {lng.toFixed(4)}) ·{' '}
                    <button type="button" className="link-btn" onClick={onClearLocation}>
                      remove pin
                    </button>
                  </>
                )
              : 'Pick a suggestion to put it on the map.'}
      </span>
    </div>
  )
}

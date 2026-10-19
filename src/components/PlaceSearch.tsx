import { useEffect, useRef, useState } from 'react'
import { useGoogleOk } from '../maps/config'
import { photonSuggest, useGoogleSuggest, type Near, type PlaceHit, type SuggestFn, type Suggestion } from '../maps/places'
import { Icon } from './Icon'

interface Props {
  value: string
  lat: number | null
  lng: number | null
  /** Results near this point rank first (e.g. the selected day's stops). */
  near: Near
  onChange: (place: string | null) => void
  onPick: (hit: PlaceHit) => void
  onClearLocation: () => void
}

/** Google Places search when a key is configured, otherwise Photon (OpenStreetMap). */
export function PlaceSearch(props: Props) {
  return useGoogleOk() ? <GooglePlaceSearch {...props} /> : <PlaceSearchField {...props} suggest={photonSuggest} source="OpenStreetMap" />
}

function GooglePlaceSearch(props: Props) {
  const suggest = useGoogleSuggest()
  return <PlaceSearchField {...props} suggest={suggest} source="Google" />
}

function PlaceSearchField({ value, lat, lng, near, onChange, onPick, onClearLocation, suggest, source }: Props & { suggest: SuggestFn | null; source: string }) {
  const [hits, setHits] = useState<Suggestion[]>([])
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
    if (!typed.current || q.length < 3 || !suggest) {
      setHits([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setState('busy')
      try {
        const found = await suggest(q, near, ctrl.signal)
        if (ctrl.signal.aborted) return
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
  }, [value, near, suggest])

  return (
    <div className="field place-search">
      <label htmlFor="f-place">Place</label>
      <div className="place-input">
        <Icon name="search" size={16} />
        <input
          id="f-place"
          placeholder={`Search ${source} for a place or address`}
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
            <li key={h.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={async () => {
                  typed.current = false
                  setOpen(false)
                  setHits([])
                  try {
                    onPick(await h.resolve())
                  } catch {
                    setState('error')
                  }
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

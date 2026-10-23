import { useEffect, useState } from 'react'
import { useGoogleOk } from '../maps/config'
import { commonsPhotos, useGooglePhotos, type Near, type PhotoHit } from '../maps/places'
import { CardImage } from './CardImage'
import { Icon } from './Icon'

interface Props {
  /** What to search for to start with (the entry's title or place). */
  query: string
  /** The entry's Google place: its photos show first. */
  placeId: string | null
  near: Near
  onPick: (photo: PhotoHit) => void
  onClose: () => void
}

/**
 * Choose a picture: all of Google's photos of the entry's place, or search Google's place photos and Wikimedia
 * Commons. For anything else, Google Images opens in a new tab (copy an image there, then paste it here).
 */
export function PhotoPicker({ query: initial, placeId, near, onPick, onClose }: Props) {
  const googleOk = useGoogleOk()
  const googlePhotos = useGooglePhotos()
  const [query, setQuery] = useState(initial)
  const [searched, setSearched] = useState(placeId ? '' : initial)
  const [place, setPlace] = useState<PhotoHit[] | null>(null)
  const [google, setGoogle] = useState<PhotoHit[] | null>(null)
  const [commons, setCommons] = useState<PhotoHit[] | null>(null)
  const [busy, setBusy] = useState(false)

  // The place's own photos.
  useEffect(() => {
    if (!placeId || !googleOk) return
    let live = true
    googlePhotos({ placeId })
      .then((p) => live && setPlace(p))
      .catch(() => live && setPlace([]))
    return () => {
      live = false
    }
  }, [placeId, googleOk, googlePhotos])

  // A search: Google's place photos and Wikimedia Commons, side by side.
  useEffect(() => {
    const q = searched.trim()
    if (!q) return
    const ctrl = new AbortController()
    setBusy(true)
    setGoogle(null)
    setCommons(null)
    Promise.all([
      googleOk ? googlePhotos({ query: q, near }).then(setGoogle, () => setGoogle([])) : Promise.resolve(setGoogle([])),
      commonsPhotos(q, ctrl.signal).then(setCommons, (e) => (e as Error).name !== 'AbortError' && setCommons([]))
    ]).finally(() => !ctrl.signal.aborted && setBusy(false))
    return () => ctrl.abort()
  }, [searched, googleOk, googlePhotos])

  const grid = (title: string, list: PhotoHit[] | null, empty: string) =>
    list === null ? null : (
      <div className="pp-section">
        <p className="pp-title">{title}</p>
        {list.length ? (
          <div className="pp-grid">
            {list.map((p, i) => (
              <button key={p.thumb + i} type="button" className="pp-photo" title={p.source} aria-label={`Use photo from ${p.source}`} onClick={() => onPick(p)}>
                <CardImage imageUrl={p.thumb} />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">{empty}</p>
        )}
      </div>
    )

  return (
    <div className="photo-picker">
      <div className="pp-head">
        <form
          className="pp-search"
          onSubmit={(e) => {
            e.preventDefault()
            setSearched(query)
          }}
        >
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search photos, e.g. Fushimi Inari" aria-label="Search photos" />
          <button type="submit" className="secondary-btn" disabled={!query.trim()}>
            Search
          </button>
        </form>
        <button type="button" className="icon-btn" aria-label="Close photo search" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      {placeId && googleOk && grid('This place on Google', place, 'Google has no photos of this place.')}
      {placeId && googleOk && place === null && <p className="muted small">Loading the place’s photos…</p>}
      {busy && <p className="muted small">Searching…</p>}
      {googleOk && grid('Google places', google, 'No Google photos for that.')}
      {grid('Wikimedia Commons', commons, 'No free photos for that.')}
      <a className="pp-google" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query || initial)}`} target="_blank" rel="noreferrer">
        <Icon name="external" size={15} /> Search Google Images
        <span className="muted small"> · copy an image there, then paste it here</span>
      </a>
    </div>
  )
}

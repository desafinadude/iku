import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useCallback, useRef } from 'react'

export interface PlaceHit {
  name: string
  detail: string
  lat: number
  lng: number
  placeId: string | null
}

export interface Suggestion {
  id: string
  name: string
  detail: string
  resolve: () => Promise<PlaceHit>
}

export type Near = { lat: number; lng: number } | null
export type SuggestFn = (q: string, near: Near, signal: AbortSignal) => Promise<Suggestion[]>

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

// Photon (komoot): OpenStreetMap search built for search-as-you-type, no key needed.
// Used when there's no Google key. (Nominatim's usage policy doesn't allow autocomplete.)
export const photonSuggest: SuggestFn = async (q, near, signal) => {
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
      const name = p.name ?? [p.housenumber, p.street].filter(Boolean).join(' ')
      const detail = [p.name ? [p.street, p.housenumber].filter(Boolean).join(' ') : '', p.district, p.city ?? p.county, p.country].filter(Boolean).join(', ')
      const hit: PlaceHit = { name, detail, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], placeId: null }
      return { id: `${name}|${hit.lat.toFixed(5)}|${hit.lng.toFixed(5)}`, name, detail, resolve: async () => hit }
    })
    .filter((s) => {
      if (!s.name || seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
}

/** Google Places (New) autocomplete. Returns null until the Places library has loaded. */
export function useGoogleSuggest(): SuggestFn | null {
  const places = useMapsLibrary('places')
  // One session token per search-then-pick, which Google bills as a single session.
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  const suggest = useCallback<SuggestFn>(
    async (q, near, signal) => {
      if (!places) return []
      token.current ??= new places.AutocompleteSessionToken()
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: token.current,
        language: 'en',
        ...(near ? { locationBias: { center: near, radius: 50_000 } } : {})
      })
      if (signal.aborted) return []
      return suggestions
        .map((s) => s.placePrediction)
        .filter((p): p is google.maps.places.PlacePrediction => !!p)
        .map((p) => {
          const name = p.mainText?.text ?? p.text.text
          const detail = p.secondaryText?.text ?? ''
          return {
            id: p.placeId,
            name,
            detail,
            resolve: async () => {
              const place = p.toPlace()
              await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
              token.current = null
              return {
                name: place.displayName ?? name,
                detail: place.formattedAddress ?? detail,
                lat: place.location!.lat(),
                lng: place.location!.lng(),
                placeId: place.id
              }
            }
          }
        })
    },
    [places]
  )
  return places ? suggest : null
}

export interface FoundPlace {
  name: string
  address: string | null
  lat: number
  lng: number
  placeId: string | null
  /** A photo of the place, if there is one. */
  photo: string | null
}

/**
 * Looks up a place by name (near a point), e.g. the one a pasted Google Maps link points to: its name,
 * address, coordinates, Google place and a photo. Null until the Places library has loaded.
 */
export function useGooglePlaceLookup() {
  const places = useMapsLibrary('places')
  return useCallback(
    async (name: string, near: Near): Promise<FoundPlace | null> => {
      if (!places) return null
      const { places: found } = await places.Place.searchByText({
        textQuery: name,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'photos'],
        maxResultCount: 1,
        language: 'en',
        ...(near ? { locationBias: { center: near, radius: 2_000 } } : {})
      })
      const place = found[0]
      if (!place?.location) return null
      return {
        name: place.displayName ?? name,
        address: place.formattedAddress ?? null,
        lat: place.location.lat(),
        lng: place.location.lng(),
        placeId: place.id,
        photo: place.photos?.[0]?.getURI({ maxWidth: 1200 }) ?? null
      }
    },
    [places]
  )
}

/** The same without a Google key: the best OpenStreetMap match (no photo). */
export async function photonLookup(name: string, near: Near): Promise<FoundPlace | null> {
  const [hit] = await photonSuggest(name, near, new AbortController().signal)
  if (!hit) return null
  const h = await hit.resolve()
  return { name: h.name, address: h.detail || null, lat: h.lat, lng: h.lng, placeId: null, photo: null }
}

/** A Google place's name, address and first photo, by its id (e.g. one just picked in the place search). */
export function useGooglePlaceDetails() {
  const places = useMapsLibrary('places')
  return useCallback(
    async (placeId: string): Promise<{ name: string | null; address: string | null; photo: string | null } | null> => {
      if (!places) return null
      const place = new places.Place({ id: placeId })
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'photos'] })
      return { name: place.displayName ?? null, address: place.formattedAddress ?? null, photo: place.photos?.[0]?.getURI({ maxWidth: 1200 }) ?? null }
    },
    [places]
  )
}

export interface PhotoHit {
  /** Small, for the picker grid. */
  thumb: string
  /** Large, for the card. */
  full: string
  /** Where it's from: the place's name, or Wikimedia Commons. */
  source: string
  /** Google's photo links expire, so these get copied when chosen; others are kept as links. */
  google: boolean
}

/** Google's photos of one place (up to 10), or of the places matching a search (a few each). */
export function useGooglePhotos() {
  const places = useMapsLibrary('places')
  return useCallback(
    async (by: { placeId: string } | { query: string; near: Near }): Promise<PhotoHit[]> => {
      if (!places) return []
      const toHits = (p: google.maps.places.Place, max: number) =>
        (p.photos ?? []).slice(0, max).map((ph) => ({ thumb: ph.getURI({ maxWidth: 400 }), full: ph.getURI({ maxWidth: 1600 }), source: p.displayName ?? 'Google', google: true }))
      if ('placeId' in by) {
        const place = new places.Place({ id: by.placeId })
        await place.fetchFields({ fields: ['displayName', 'photos'] })
        return toHits(place, 10)
      }
      const { places: found } = await places.Place.searchByText({
        textQuery: by.query,
        fields: ['displayName', 'photos'],
        maxResultCount: 5,
        language: 'en',
        ...(by.near ? { locationBias: { center: by.near, radius: 20_000 } } : {})
      })
      return found.flatMap((p) => toHits(p, 4))
    },
    [places]
  )
}

/** Free-to-use photos from Wikimedia Commons (no key; good for landmarks, temples, views). */
export async function commonsPhotos(query: string, signal?: AbortSignal): Promise<PhotoHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1200'
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal })
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`)
  const body = (await res.json()) as { query?: { pages?: Record<string, { index?: number; imageinfo?: { thumburl?: string; url?: string }[] }> } }
  return Object.values(body.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => p.imageinfo?.[0])
    .filter((i): i is { thumburl: string; url?: string } => !!i?.thumburl)
    .map((i) => ({ thumb: i.thumburl, full: i.thumburl, source: 'Wikimedia Commons', google: false }))
}

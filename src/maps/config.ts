import { useSyncExternalStore } from 'react'

// Google Maps is used when a browser key is configured; otherwise the app falls back to
// OpenStreetMap tiles (Leaflet) and Photon place search, which need no key.
const env = import.meta.env
export const GOOGLE_KEY = (env.VITE_GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '') as string
/** Advanced markers need a Map ID; Google's demo ID works until you create your own. */
export const GOOGLE_MAP_ID = (env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID') as string
export const useGoogleMaps = GOOGLE_KEY.length > 0

/** Google Maps links work for everyone, with or without the API key. */
export function googleMapsUrl(o: { name?: string | null; lat?: number | null; lng?: number | null; placeId?: string | null }) {
  const query = o.name || (o.lat != null && o.lng != null ? `${o.lat},${o.lng}` : '')
  if (!query) return null
  const p = new URLSearchParams({ api: '1', query })
  if (o.placeId) p.set('query_place_id', o.placeId)
  return `https://www.google.com/maps/search/?${p}`
}

export function directionsUrl(o: { lat?: number | null; lng?: number | null; placeId?: string | null }) {
  if (o.lat == null || o.lng == null) return null
  const p = new URLSearchParams({ api: '1', destination: `${o.lat},${o.lng}` })
  if (o.placeId) p.set('destination_place_id', o.placeId)
  return `https://www.google.com/maps/dir/?${p}`
}

// Google calls window.gm_authFailure when the key is rejected (wrong key, billing off, site
// not allowed). We then fall back to OpenStreetMap for the rest of the session.
let googleRejected = false
const listeners = new Set<() => void>()
declare global {
  interface Window {
    gm_authFailure?: () => void
  }
}
if (useGoogleMaps) {
  window.gm_authFailure = () => {
    googleRejected = true
    console.warn('Google Maps rejected the API key; using OpenStreetMap instead.')
    listeners.forEach((l) => l())
  }
}

export function markGoogleBroken() {
  if (googleRejected) return
  googleRejected = true
  listeners.forEach((l) => l())
}

/** True while Google Maps is configured and hasn't failed. */
export function useGoogleOk() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => useGoogleMaps && !googleRejected
  )
}

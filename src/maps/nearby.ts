import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'
import type { Bounds, NearbyPin } from './types'

/** Everyday things worth seeing around you, found with Google Places (Nearby Search). */
export const NEARBY: { id: string; label: string; types: string[]; icon: string; color: string }[] = [
  { id: 'stations', label: 'Stations', types: ['train_station', 'subway_station', 'light_rail_station'], icon: 'train-front-tunnel', color: '#334155' },
  { id: 'konbini', label: 'Convenience stores', types: ['convenience_store'], icon: 'store', color: '#0f766e' },
  { id: 'cafes', label: 'Cafés', types: ['cafe', 'coffee_shop'], icon: 'coffee', color: '#92400e' },
  { id: 'atms', label: 'ATMs', types: ['atm'], icon: 'banknote', color: '#15803d' },
  { id: 'toilets', label: 'Toilets', types: ['public_bathroom'], icon: 'toilet', color: '#1d4ed8' }
]

const cache = new Map<string, NearbyPin[]>()

/**
 * Places of the chosen kinds around the middle of the map, once zoomed in far enough to be useful (each search
 * is a billed Places request, so results are kept per spot for the session).
 */
export function useNearby(kinds: string[], view: { bounds: Bounds; zoom: number } | null) {
  const places = useMapsLibrary('places')
  const [pins, setPins] = useState<NearbyPin[]>([])
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'zoom'>('idle')
  const on = kinds.length > 0 && !!places
  const close = !!view && view.zoom >= 14
  const [s, w, n, e] = view?.bounds ?? [0, 0, 0, 0]
  const lat = (s + n) / 2
  const lng = (w + e) / 2
  // Half the visible height, in metres, up to 2.5 km.
  const radius = Math.min(2500, Math.max(300, ((n - s) * 111_000) / 2))
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(radius / 250)}`

  useEffect(() => {
    if (!on) {
      setPins([])
      setState('idle')
      return
    }
    if (!close) {
      setPins([])
      setState('zoom')
      return
    }
    let live = true
    const t = setTimeout(async () => {
      setState('busy')
      try {
        const all = await Promise.all(
          NEARBY.filter((k) => kinds.includes(k.id)).map(async (k) => {
            const ck = `${k.id}:${key}`
            const hit = cache.get(ck)
            if (hit) return hit
            const { places: found } = await places!.Place.searchNearby({
              fields: ['id', 'displayName', 'location'],
              locationRestriction: { center: { lat, lng }, radius },
              includedTypes: k.types,
              maxResultCount: 20,
              language: 'en'
            })
            const list: NearbyPin[] = found
              .filter((p) => p.location)
              .map((p) => ({ id: p.id, name: p.displayName ?? k.label, lat: p.location!.lat(), lng: p.location!.lng(), icon: k.icon, color: k.color }))
            cache.set(ck, list)
            return list
          })
        )
        if (!live) return
        setPins(all.flat())
        setState('idle')
      } catch {
        if (live) setState('error')
      }
    }, 600)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [on, close, key, kinds.join()])

  return { pins, state }
}

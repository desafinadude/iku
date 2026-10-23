import { useEffect, useState } from 'react'
import type { Areas, Bounds } from './types'

// Neighbourhood names and borders come from OpenStreetMap via the free Overpass API (no key). Public servers
// get busy, so each is given a few seconds before trying the next.
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const cache = new Map<string, Areas>()

/** Which administrative borders to draw: wards when zoomed out, neighbourhoods closer in (none further out). */
function levelsFor(zoom: number) {
  if (zoom >= 15) return [9, 10]
  if (zoom >= 13) return [7, 8, 9]
  return []
}
/** Which named places to label: districts from zoom 11, neighbourhoods from 14. */
function placesFor(zoom: number) {
  if (zoom >= 14) return ['suburb', 'quarter', 'neighbourhood']
  if (zoom >= 11) return ['suburb']
  return null
}

interface OverpassMember {
  type: string
  ref: number
  geometry?: ({ lat: number; lon: number } | null)[]
}
interface OverpassElement {
  type: 'relation' | 'node'
  lat?: number
  lon?: number
  tags?: Record<string, string>
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  members?: OverpassMember[]
}

/** Turns an Overpass reply into lines (each shared border once) and a name in the middle of each area. */
export function parseAreas(elements: OverpassElement[], [s, w, n, e]: Bounds): Areas {
  const lines: Areas['lines'] = []
  const labels: Areas['labels'] = []
  const seen = new Map<number, number>()
  const named = new Set<string>()
  // Named places (points) first: they're the neighbourhood names people use.
  for (const pt of elements) {
    const name = pt.type === 'node' ? pt.tags?.['name:en'] || pt.tags?.name : null
    if (!name || pt.lat == null || pt.lon == null || named.has(name)) continue
    named.add(name)
    labels.push({ name, lat: pt.lat, lng: pt.lon, level: pt.tags?.place === 'suburb' ? 8 : 10 })
  }
  for (const r of elements) {
    if (r.type !== 'relation') continue
    const level = Number(r.tags?.admin_level ?? 10)
    for (const m of r.members ?? []) {
      if (m.type !== 'way' || !m.geometry) continue
      // A border between two areas belongs to both: draw it once, at the bigger area's (lower) level.
      if (seen.has(m.ref) && seen.get(m.ref)! <= level) continue
      seen.set(m.ref, level)
      // Clipped ways have gaps (null) where they leave the area asked for.
      let path: [number, number][] = []
      for (const pt of m.geometry) {
        if (pt) path.push([pt.lat, pt.lon])
        else if (path.length) {
          if (path.length > 1) lines.push({ level, path })
          path = []
        }
      }
      if (path.length > 1) lines.push({ level, path })
    }
    const name = r.tags?.['name:en'] || r.tags?.name
    const b = r.bounds
    if (name && b && !named.has(name)) {
      named.add(name)
      const lat = (b.minlat + b.maxlat) / 2
      const lng = (b.minlon + b.maxlon) / 2
      if (lat > s && lat < n && lng > w && lng < e) labels.push({ name, lat, lng, level })
    }
  }
  return { lines, labels }
}

async function fetchAreas(bounds: Bounds, levels: number[], places: string[], signal: AbortSignal): Promise<Areas> {
  const bbox = bounds.join(',')
  const query =
    `[out:json][timeout:20];node["place"~"^(${places.join('|')})$"]["name"](${bbox});out;` +
    (levels.length ? `relation["boundary"="administrative"]["admin_level"~"^(${levels.join('|')})$"](${bbox});out geom(${bbox});` : '')
  let lastError: unknown = null
  for (const server of SERVERS) {
    if (signal.aborted) break
    // Give up on a slow server after 12 s, or when the map moves on.
    const timeout = AbortSignal.timeout(12_000)
    const either = AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal
    try {
      // A form-encoded POST is a "simple" request: no CORS preflight.
      const res = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: query }), signal: either })
      if (!res.ok) throw new Error(`Overpass ${res.status}`)
      const body = (await res.json()) as { elements: OverpassElement[] }
      return parseAreas(body.elements, bounds)
    } catch (e) {
      if (signal.aborted) throw e
      lastError = e
    }
  }
  throw lastError ?? new DOMException('Aborted', 'AbortError')
}

/**
 * Boundaries for the visible area while `on`. The area asked for is padded and snapped to a grid so small
 * pans reuse what's loaded; results are kept for the session.
 */
export function useAreas(on: boolean, view: { bounds: Bounds; zoom: number } | null) {
  const [areas, setAreas] = useState<Areas | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'zoom'>('idle')
  const places = view ? placesFor(view.zoom) : null
  const levels = view && places ? levelsFor(view.zoom) : null
  const step = view && view.zoom >= 15 ? 0.01 : view && view.zoom >= 13 ? 0.02 : 0.05
  const snapped: Bounds | null =
    view && places && levels
      ? [Math.floor(view.bounds[0] / step) * step, Math.floor(view.bounds[1] / step) * step, Math.ceil(view.bounds[2] / step) * step, Math.ceil(view.bounds[3] / step) * step].map((v) => Number(v.toFixed(3))) as Bounds
      : null
  const key = snapped && levels && places ? `${places.join('|')}:${levels.join('|')}:${snapped.join(',')}` : null

  useEffect(() => {
    if (!on) return setAreas(null)
    if (!key || !snapped || !levels || !places) {
      setAreas(null)
      setState(view ? 'zoom' : 'idle')
      return
    }
    const hit = cache.get(key)
    if (hit) {
      setAreas(hit)
      setState('idle')
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setState('busy')
      try {
        const found = await fetchAreas(snapped, levels, places, ctrl.signal)
        cache.set(key, found)
        setAreas(found)
        setState('idle')
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setState('error')
      }
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [on, key])

  return { areas, state }
}

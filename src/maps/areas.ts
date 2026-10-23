import { useEffect, useState } from 'react'
import type { Areas, Bounds } from './types'

// Neighbourhood and ward boundaries come from OpenStreetMap via the free Overpass API (no key).
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const cache = new Map<string, Areas>()

/** Which administrative levels to draw: wards when zoomed out, neighbourhoods closer in. */
function levelsFor(zoom: number) {
  if (zoom >= 15) return [9, 10]
  if (zoom >= 13) return [8, 9]
  if (zoom >= 11) return [7, 8]
  return null
}

interface OverpassMember {
  type: string
  ref: number
  geometry?: ({ lat: number; lon: number } | null)[]
}
interface OverpassRelation {
  type: 'relation'
  tags?: Record<string, string>
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  members?: OverpassMember[]
}

/** Turns an Overpass reply into lines (each shared border once) and a name in the middle of each area. */
export function parseAreas(elements: OverpassRelation[], [s, w, n, e]: Bounds): Areas {
  const lines: Areas['lines'] = []
  const labels: Areas['labels'] = []
  const seen = new Map<number, number>()
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
    if (name && b) {
      const lat = (b.minlat + b.maxlat) / 2
      const lng = (b.minlon + b.maxlon) / 2
      if (lat > s && lat < n && lng > w && lng < e) labels.push({ name, lat, lng, level })
    }
  }
  return { lines, labels }
}

async function fetchAreas(bounds: Bounds, levels: number[], signal: AbortSignal): Promise<Areas> {
  const bbox = bounds.join(',')
  const query = `[out:json][timeout:25];relation["boundary"="administrative"]["admin_level"~"^(${levels.join('|')})$"](${bbox});out geom(${bbox});`
  let lastError: unknown = null
  for (const server of SERVERS) {
    try {
      const res = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: query }), signal })
      if (!res.ok) throw new Error(`Overpass ${res.status}`)
      const body = (await res.json()) as { elements: OverpassRelation[] }
      return parseAreas(body.elements, bounds)
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      lastError = e
    }
  }
  throw lastError
}

/**
 * Boundaries for the visible area while `on`. The area asked for is padded and snapped to a grid so small
 * pans reuse what's loaded; results are kept for the session.
 */
export function useAreas(on: boolean, view: { bounds: Bounds; zoom: number } | null) {
  const [areas, setAreas] = useState<Areas | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'zoom'>('idle')
  const levels = view ? levelsFor(view.zoom) : null
  const step = view && view.zoom >= 15 ? 0.01 : 0.05
  const snapped: Bounds | null =
    view && levels
      ? [Math.floor(view.bounds[0] / step) * step, Math.floor(view.bounds[1] / step) * step, Math.ceil(view.bounds[2] / step) * step, Math.ceil(view.bounds[3] / step) * step].map((v) => Number(v.toFixed(3))) as Bounds
      : null
  const key = snapped && levels ? `${levels.join('|')}:${snapped.join(',')}` : null

  useEffect(() => {
    if (!on) return setAreas(null)
    if (!key || !snapped || !levels) {
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
        const found = await fetchAreas(snapped, levels, ctrl.signal)
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

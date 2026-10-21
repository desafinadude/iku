import { useSyncExternalStore } from 'react'

/** Lucide icon data: [tag, attributes, children?]. */
export type IconNode = [string, Record<string, string | number>, IconNode[]?]

// The whole Lucide set (~1,700 icons) loads once, in its own chunk, the first time an icon is needed.
let icons: Record<string, IconNode> | null = null
let byName: Map<string, IconNode> | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

/** "TrainFront" → "train-front", "Gamepad2" → "gamepad-2" (Lucide's own names). */
const kebab = (pascal: string) =>
  pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase()

export function loadLucide() {
  loading ??= import('lucide').then((m) => {
    icons = m.icons as unknown as Record<string, IconNode>
    byName = new Map(Object.entries(icons).map(([k, v]) => [kebab(k), v]))
    listeners.forEach((f) => f())
  })
  return loading
}

const subscribe = (f: () => void) => {
  listeners.add(f)
  loadLucide()
  return () => listeners.delete(f)
}
/** Re-renders the caller once the icon set has loaded. */
export const useLucide = () => useSyncExternalStore(subscribe, () => icons !== null)

export const lucideNode = (name: string) => byName?.get(name) ?? null
export const lucideNames = () => (byName ? [...byName.keys()] : [])

const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
/** SVG markup for places that need an HTML string (Leaflet map pins). */
export function lucideSvg(node: IconNode, size: number, color: string) {
  const [, attrs, children = []] = node
  const a = { ...attrs, width: size, height: size, stroke: color, 'stroke-width': 2.25 }
  const inner = children.map(([t, at]) => `<${t} ${Object.entries(at).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`).join('')
  return `<svg ${Object.entries(a).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')} aria-hidden="true">${inner}</svg>`
}

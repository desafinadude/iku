import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { normalizeLabels } from '../data/normalize'
import type { Item, Label } from '../types'

export interface Style {
  name: string
  color: string
  /** Light tint of the colour, for card and block backgrounds. */
  bg: string
  icon: string
}

export interface TagStyle {
  name: string
  color: string | null
  bg: string | null
  icon: string | null
  /** Saved style row (null when the tag has no style yet). */
  label: Label | null
}

interface LabelsApi {
  /** Every tag: styled ones in their order, then the rest by how often they're used. */
  tags: TagStyle[]
  tagStyle: (tag: string) => TagStyle
  /** An entry's look: its first tag with a colour, else neutral. */
  itemStyle: (item: Item) => Style
  labels: Label[]
}

const NEUTRAL = '#4A5550'

/** Mixes a colour with white: a 12% tint for backgrounds. */
export function tint(hex: string, amount = 0.12) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(255 - (255 - c) * amount)
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

const Ctx = createContext<LabelsApi | null>(null)

export function LabelsProvider({ tripId, labels, items, children }: { tripId: string; labels: Label[]; items: Item[]; children: ReactNode }) {
  const api = useMemo<LabelsApi>(() => {
    const styled = normalizeLabels(labels, items, tripId).sort((a, b) => a.sort - b.sort)
    const byName = new Map(styled.map((l) => [l.name.toLowerCase(), l]))
    const tagStyle = (tag: string): TagStyle => {
      const l = byName.get(tag.toLowerCase()) ?? null
      return { name: tag, color: l?.color ?? null, bg: l?.color ? tint(l.color) : null, icon: l?.icon ?? null, label: l }
    }
    const counts = new Map<string, number>()
    items.forEach((x) => x.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    const unstyled = [...counts.keys()].filter((t) => !byName.has(t.toLowerCase())).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
    const neutral: Style = { name: '', color: NEUTRAL, bg: tint(NEUTRAL, 0.08), icon: 'location_on' }
    return {
      tags: [...styled.map((l) => tagStyle(l.name)), ...unstyled.map(tagStyle)],
      tagStyle,
      itemStyle: (item) => {
        const t = item.tags.map(tagStyle).find((s) => s.color)
        return t ? { name: t.name, color: t.color!, bg: t.bg!, icon: t.icon ?? 'location_on' } : neutral
      },
      labels: styled
    }
  }, [labels, items, tripId])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useLabels() {
  const api = useContext(Ctx)
  if (!api) throw new Error('useLabels needs a LabelsProvider')
  return api
}

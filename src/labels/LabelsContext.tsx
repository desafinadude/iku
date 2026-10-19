import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { DEFAULT_TYPES, type Item, type Label } from '../types'

export interface Style {
  name: string
  color: string
  /** Light tint of the colour, for chip and card backgrounds. */
  bg: string
  icon: string
}

export interface TagStyle {
  name: string
  color: string | null
  bg: string | null
  icon: string | null
}

interface LabelsApi {
  /** Types in display order: the trip's own, else the built-ins, plus any found on entries. */
  types: Style[]
  typeStyle: (name: string) => Style
  tagStyle: (tag: string) => TagStyle
  /** Styled tags plus tags used on entries, most used first. */
  tags: TagStyle[]
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

export function LabelsProvider({ labels, items, children }: { labels: Label[]; items: Item[]; children: ReactNode }) {
  const api = useMemo<LabelsApi>(() => {
    const typeRows = labels.filter((l) => l.kind === 'type').sort((a, b) => a.sort - b.sort)
    const base = typeRows.length
      ? typeRows.map((l) => ({ name: l.name, color: l.color ?? NEUTRAL, icon: l.icon ?? 'location_on' }))
      : DEFAULT_TYPES
    const types: Style[] = base.map((t) => ({ ...t, bg: tint(t.color) }))
    // Entries may use a type that has no style yet (e.g. renamed elsewhere): still show it.
    for (const name of new Set(items.map((x) => x.type))) {
      if (!types.some((t) => t.name === name)) types.push({ name, color: NEUTRAL, bg: tint(NEUTRAL), icon: 'location_on' })
    }
    const byType = new Map(types.map((t) => [t.name, t]))

    const tagRows = new Map(labels.filter((l) => l.kind === 'tag').map((l) => [l.name, l]))
    const counts = new Map<string, number>()
    items.forEach((x) => x.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    const tagNames = [...new Set([...tagRows.keys(), ...counts.keys()])].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
    const tagStyle = (tag: string): TagStyle => {
      const l = tagRows.get(tag)
      return { name: tag, color: l?.color ?? null, bg: l?.color ? tint(l.color) : null, icon: l?.icon ?? null }
    }

    return {
      types,
      typeStyle: (name) => byType.get(name) ?? { name, color: NEUTRAL, bg: tint(NEUTRAL), icon: 'location_on' },
      tagStyle,
      tags: tagNames.map(tagStyle),
      labels
    }
  }, [labels, items])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useLabels() {
  const api = useContext(Ctx)
  if (!api) throw new Error('useLabels needs a LabelsProvider')
  return api
}

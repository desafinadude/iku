import { colorCss, colorStops, isLight, onColor } from '../colors'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { normalizeLabels } from '../data/normalize'
import type { DayInfo, Item, Label } from '../types'

export interface Style {
  name: string
  color: string
  /** Icon and text colour on `color`. */
  fg: string
  /** Light tint of the colour, for card and block backgrounds. */
  bg: string
  icon: string
}

export interface TagStyle {
  name: string
  color: string | null
  bg: string | null
  icon: string | null
  /** Icon and text colour on `color` (the chosen one, else white or ink). */
  fg: string
  /** Saved style row (null when the tag has no style yet). */
  label: Label | null
}

interface LabelsApi {
  /** Every tag: styled ones in their order, then the rest by how often they're used. */
  tags: TagStyle[]
  tagStyle: (tag: string) => TagStyle
  /** An entry's look: its first tag with a colour, else neutral. */
  itemStyle: (item: Item) => Style
  /** A day's title, tag and colour (its own colour, else its tag's). */
  dayStyle: (day: string) => DayStyle
  labels: Label[]
}

export interface DayStyle {
  info: DayInfo | null
  title: string | null
  tag: string | null
  color: string | null
  /** Soft tint for the day's background. */
  bg: string | null
  /** Opening image at the top of the day. */
  image: string | null
  /** The column's background: the tint, or a top-to-bottom blend into a second colour. */
  background: string | null
  /** Header band colour and its text colour (null: default grey). */
  header: string | null
  headerFg: string | null
}

const NEUTRAL = '#4A5550'

/** Mixes a colour with white: a 12% tint for backgrounds. */
export function tint(hex: string, amount = 0.12) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(255 - (255 - c) * amount)
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

const Ctx = createContext<LabelsApi | null>(null)

export function LabelsProvider({ tripId, labels, items, days = [], children }: { tripId: string; labels: Label[]; items: Item[]; days?: DayInfo[]; children: ReactNode }) {
  const api = useMemo<LabelsApi>(() => {
    const styled = normalizeLabels(labels, items, tripId).sort((a, b) => a.sort - b.sort)
    const byName = new Map(styled.map((l) => [l.name.toLowerCase(), l]))
    const tagStyle = (tag: string): TagStyle => {
      const l = byName.get(tag.toLowerCase()) ?? null
      return { name: tag, color: l?.color ?? null, bg: l?.color ? tint(l.color) : null, icon: l?.icon ?? null, fg: l?.iconColor ?? (l?.color ? onColor(l.color) : 'var(--ink-2)'), label: l }
    }
    const counts = new Map<string, number>()
    items.forEach((x) => x.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    const unstyled = [...counts.keys()].filter((t) => !byName.has(t.toLowerCase())).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
    const neutral: Style = { name: '', color: NEUTRAL, fg: '#fff', bg: tint(NEUTRAL, 0.08), icon: 'location_on' }
    return {
      tags: [...styled.map((l) => tagStyle(l.name)), ...unstyled.map(tagStyle)],
      tagStyle,
      itemStyle: (item) => {
        const t = item.tags.map(tagStyle).find((s) => s.color)
        return t ? { name: t.name, color: t.color!, fg: t.fg, bg: t.bg!, icon: t.icon ?? 'location_on' } : neutral
      },
      dayStyle: (day) => {
        // A pale colour is used as picked; a strong one is softened so cards stay readable on it.
        const soft = (c: string) => (isLight(c) ? c : tint(c, 0.16))
        const info = days.find((d) => d.day === day) ?? null
        const headerStops = colorStops(info?.headerColor)
        // Without its own column colour, a day takes a very pale version of its header colour (gradient too).
        const veryLight = (c: string) => tint(c, 0.12)
        const fromHeader = !info?.color && headerStops.length > 0
        const color = info?.color ?? headerStops[0] ?? (info?.tag ? tagStyle(info.tag).color : null)
        const background = fromHeader
          ? headerStops[1]
            ? `linear-gradient(to bottom, ${veryLight(headerStops[0])} 0%, ${veryLight(headerStops[1])} 100%)`
            : veryLight(headerStops[0])
          : info?.blendColor
            ? `linear-gradient(to bottom, ${color ? soft(color) : '#edeeea'} 0%, ${soft(info.blendColor)} 100%)`
            : color
              ? soft(color)
              : null
        return {
          info,
          title: info?.title ?? null,
          tag: info?.tag ?? null,
          color,
          bg: fromHeader ? veryLight(headerStops[0]) : color ? soft(color) : null,
          image: info?.image ?? null,
          background,
          header: colorCss(info?.headerColor) ?? null,
          headerFg: info?.headerText ?? (headerStops[0] ? onColor(headerStops[0]) : null)
        }
      },
      labels: styled
    }
  }, [labels, items, tripId, days])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useLabels() {
  const api = useContext(Ctx)
  if (!api) throw new Error('useLabels needs a LabelsProvider')
  return api
}

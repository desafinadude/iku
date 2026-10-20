import { cleanTags, normalizeTag } from '../lib'
import { DEFAULT_TAG_STYLES, type Item, type Label } from '../types'

/** Entries saved before types became tags carry a `type`; it becomes their first tag. */
export function normalizeItem(raw: Item & { type?: string | null }): Item {
  const { type, ...item } = raw
  return { ...item, tags: cleanTags([type, ...(raw.tags ?? [])]) }
}

/** Synthetic styles (not stored yet) have ids starting with this. */
export const DEFAULT_LABEL_ID = 'default:'

/**
 * Tag styles: old '#tag' names and old type styles become plain tag styles (a tag style wins
 * over a type style of the same name). Built-in styles fill in for common tags in use that
 * have no style yet, as they did when they were types.
 */
export function normalizeLabels(labels: Label[], items: Item[], tripId: string): Label[] {
  const byName = new Map<string, Label>()
  const sorted = [...labels].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'tag' ? -1 : 1))
  for (const l of sorted) {
    const name = normalizeTag(l.name)
    if (!name || byName.has(name.toLowerCase())) continue
    byName.set(name.toLowerCase(), { ...l, kind: 'tag', name })
  }
  const used = new Set(items.flatMap((x) => x.tags.map((t) => t.toLowerCase())))
  DEFAULT_TAG_STYLES.forEach((d, i) => {
    if (used.has(d.name.toLowerCase()) && !byName.has(d.name.toLowerCase())) {
      byName.set(d.name.toLowerCase(), { id: DEFAULT_LABEL_ID + d.name, tripId, kind: 'tag', name: d.name, color: d.color, icon: d.icon, sort: i })
    }
  })
  return [...byName.values()]
}

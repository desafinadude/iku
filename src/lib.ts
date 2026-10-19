import type { Filters, Item, Trip } from './types'
import { statusOf } from './types'

export function tripDays(trip: Trip): string[] {
  const days: string[] = []
  const d = new Date(trip.startDate + 'T00:00:00Z')
  const end = new Date(trip.endDate + 'T00:00:00Z')
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

export function dayLabel(day: string) {
  const d = new Date(day + 'T00:00:00Z')
  return {
    dow: d.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
    num: String(d.getUTCDate()),
    month: d.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' })
  }
}

export function tripRange(trip: Trip) {
  const a = dayLabel(trip.startDate)
  const b = dayLabel(trip.endDate)
  const n = tripDays(trip).length
  const range = a.month === b.month ? `${a.num} – ${b.num} ${b.month}` : `${a.num} ${a.month} – ${b.num} ${b.month}`
  return `${range} · ${n} days`
}

export function domainOf(url: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function isUrl(text: string) {
  return /^https?:\/\/\S+$/i.test(text.trim())
}

export function normalizeTag(tag: string) {
  const t = tag.trim().toLowerCase().replace(/\s+/g, '-')
  if (!t) return ''
  return t.startsWith('#') ? t : '#' + t
}

export function matches(item: Item, f: Filters) {
  if (f.search) {
    const q = f.search.toLowerCase()
    const hay = [item.title, item.note, item.place, item.url, ...item.tags].join(' ').toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (f.types.length && !f.types.includes(item.type)) return false
  if (f.statuses.length && !f.statuses.includes(statusOf(item))) return false
  if (f.tags.length) {
    const ok = f.matchAllTags ? f.tags.every((t) => item.tags.includes(t)) : f.tags.some((t) => item.tags.includes(t))
    if (!ok) return false
  }
  return true
}

export function byTime(a: Item, b: Item) {
  return (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.sort - b.sort
}

export function activeFilterCount(f: Filters) {
  return f.types.length + f.tags.length + f.statuses.length + (f.search ? 1 : 0)
}

export function uid() {
  return crypto.randomUUID()
}

import type { Filters, Item, Member, Trip } from './types'
import { MEMBER_COLORS, statusOf } from './types'

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
  if (f.people.length && !(item.createdBy && f.people.includes(item.createdBy))) return false
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
  return f.types.length + f.tags.length + f.statuses.length + f.people.length + (f.search ? 1 : 0)
}

export function uid() {
  return crypto.randomUUID()
}

export function displayName(m: Member) {
  return m.name?.trim() || m.email.split('@')[0]
}

export function initials(m: Member) {
  const parts = displayName(m).split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** The member's chosen colour, or a stable one picked from their email. */
export function memberColor(m: Member) {
  if (m.color) return m.color
  let h = 0
  for (const ch of m.email) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return MEMBER_COLORS[h % MEMBER_COLORS.length]
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

/** Centre-crops an image file to a small square JPEG data URL (~10 KB) for avatars. */
export async function avatarFromFile(file: File, size = 160): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

/**
 * Previews that need no server: YouTube thumbnails from the video id, and
 * coordinates from Google Maps links (".../@35.6812,139.7671,15z" or "?q=lat,lng").
 */
export function quickPreview(url: string): { image: string | null; lat: number | null; lng: number | null } {
  let image: string | null = null
  let lat: number | null = null
  let lng: number | null = null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    const yt =
      host === 'youtu.be' ? u.pathname.slice(1) : host.endsWith('youtube.com') ? (u.searchParams.get('v') ?? u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1]) : null
    if (yt) image = `https://i.ytimg.com/vi/${yt.split('/')[0]}/hqdefault.jpg`
    if (/(^|\.)google\.[a-z.]+$/.test(host) || host === 'maps.app.goo.gl') {
      const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? (u.searchParams.get('q') ?? u.searchParams.get('ll') ?? '').match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/)
      if (m) {
        lat = Number(m[1])
        lng = Number(m[2])
      }
    }
  } catch {
    /* not a URL */
  }
  return { image, lat, lng }
}

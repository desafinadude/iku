// Pure HTML → link preview parsing, shared by the edge function and its tests.

export interface Preview {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
  lat: number | null
  lng: number | null
  /** Where a saved post points (e.g. the page a Pinterest pin links to), if different from url. */
  sourceUrl?: string | null
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

function attrs(tag: string) {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '').trim()
  }
  return out
}

export function parsePreview(html: string, pageUrl: string): Preview {
  const head = html.slice(0, 600_000)
  const meta = new Map<string, string>()
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0])
    const key = (a.property || a.name || a.itemprop || '').toLowerCase()
    if (key && a.content && !meta.has(key)) meta.set(key, a.content)
  }
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]))
  const abs = (u: string | undefined | null) => {
    if (!u) return null
    try {
      const r = new URL(u, pageUrl)
      return r.protocol === 'http:' || r.protocol === 'https:' ? r.href : null
    } catch {
      return null
    }
  }
  const first = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v && v.trim()) ?? null
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const num = (v: string | null) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null)

  let lat = num(first('og:latitude', 'place:location:latitude', 'geo.position')?.split(/[;,]/)[0] ?? null)
  let lng = num(first('og:longitude', 'place:location:longitude') ?? first('geo.position')?.split(/[;,]/)[1] ?? null)
  if (lat == null || lng == null) {
    const icbm = first('icbm')?.split(',')
    if (icbm?.length === 2) {
      lat = num(icbm[0].trim())
      lng = num(icbm[1].trim())
    }
  }

  return {
    url: pageUrl,
    title: clean(first('og:title', 'twitter:title') ?? (titleTag ? decodeEntities(titleTag) : null)),
    description: clean(first('og:description', 'twitter:description', 'description')),
    image: abs(
      first('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src', 'image') ??
        links.find((l) => l.rel?.toLowerCase() === 'image_src')?.href
    ),
    siteName: clean(first('og:site_name', 'application-name')),
    lat,
    lng,
    sourceUrl: abs(first('pinterestapp:source', 'og:see_also'))
  }
}

function clean(s: string | null) {
  if (!s) return null
  const t = s.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, 500) : null
}

/** "https://www.pinterest.com/pin/123/sent/?invite_code=…" → "https://www.pinterest.com/pin/123/" */
export function pinterestPinUrl(url: string): string | null {
  const m = url.match(/^https?:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?pinterest\.[a-z.]+\/pin\/(\d+)/i)
  return m ? `https://www.pinterest.com/pin/${m[1]}/` : null
}

/** A pin's caption: first line as the title (hashtags removed), the rest as a description. */
export function splitCaption(caption: string | null | undefined) {
  if (!caption) return { title: null, description: null }
  const lines = caption.split(/\n+/).map((l) => l.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)
  return { title: lines[0]?.slice(0, 200) ?? null, description: lines.slice(1).join('\n').slice(0, 800) || null }
}

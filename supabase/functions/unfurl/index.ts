// Supabase Edge Function: fetches a web page and returns its link preview
// (title, description, image, coordinates). Only signed-in users can call it,
// because Supabase checks the caller's JWT before this code runs.
import { parsePreview, type Preview } from './parse.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Refuse obvious internal targets so this can't be used to probe private networks.
function isPublicHttpUrl(u: URL) {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false
  if (h.includes(':') /* IPv6 literal */) return false
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let target: URL
  try {
    const { url } = await req.json()
    target = new URL(String(url))
  } catch {
    return json({ error: 'Send {"url": "https://…"}' }, 400)
  }
  if (!isPublicHttpUrl(target)) return json({ error: 'Only public http(s) links' }, 400)

  let preview: Preview | null = null
  try {
    preview = await fromPage(target)
  } catch {
    /* blocked or unreachable: try the fallback below */
  }
  // Sites like TripAdvisor and Airbnb block preview bots; Microlink's free tier often gets through.
  if (!preview?.image) {
    const fallback = await fromMicrolink(target.href).catch(() => null)
    if (fallback) preview = { ...fallback, lat: preview?.lat ?? null, lng: preview?.lng ?? null, title: preview?.title ?? fallback.title, description: preview?.description ?? fallback.description }
  }
  return preview ? json(preview) : json({ error: 'Couldn’t load a preview for that link' }, 502)
})

async function fromMicrolink(url: string): Promise<Preview | null> {
  const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) })
  const body = await res.json()
  if (body.status !== 'success') return null
  const d = body.data ?? {}
  return { url: d.url ?? url, title: d.title ?? null, description: d.description ?? null, image: d.image?.url ?? null, siteName: d.publisher ?? null, lat: null, lng: null }
}

async function fromPage(target: URL): Promise<Preview | null> {
  const res = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: {
      // Many sites only serve preview tags to link-preview bots.
      'User-Agent': 'Mozilla/5.0 (compatible; IkuLinkPreview/1.0; +https://github.com/desafinadude/iku) facebookexternalhit/1.1',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en'
    }
  })
  const finalUrl = res.url || target.href
  // Error and bot-block pages ("Access Denied") would give a misleading title.
  if (!res.ok) return null
  if (!(res.headers.get('content-type') ?? '').includes('html')) {
    // A direct image link is its own preview.
    const isImage = (res.headers.get('content-type') ?? '').startsWith('image/')
    return { url: finalUrl, title: null, description: null, image: isImage ? finalUrl : null, siteName: null, lat: null, lng: null }
  }
  // Read at most ~1 MB: preview tags live in <head>.
  const reader = res.body!.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < 1_000_000) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
    if (new TextDecoder().decode(value).includes('</head>')) break
  }
  reader.cancel().catch(() => {})
  const html = new TextDecoder().decode(concat(chunks))
  return parsePreview(html, finalUrl)
}

function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let i = 0
  for (const c of chunks) {
    out.set(c, i)
    i += c.length
  }
  return out
}

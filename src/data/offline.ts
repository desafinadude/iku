// Device-local storage for offline use: files the person marked "available offline"
// (Cache Storage) and the last trip data that loaded (localStorage).
import type { TripData } from './backend'

const FILES = 'iku-files-v1'
const SNAPSHOT = 'iku:snapshot'
const key = (id: string) => `/__iku_offline__/${id}`

const cacheAvailable = () => typeof caches !== 'undefined'

export async function savedFileIds(): Promise<Set<string>> {
  if (!cacheAvailable()) return new Set()
  try {
    const cache = await caches.open(FILES)
    const keys = await cache.keys()
    return new Set(keys.map((r) => new URL(r.url).pathname.split('/').pop()!))
  } catch {
    return new Set()
  }
}

export async function saveFile(id: string, blob: Blob) {
  const cache = await caches.open(FILES)
  await cache.put(key(id), new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } }))
}

export async function getFile(id: string): Promise<Blob | null> {
  if (!cacheAvailable()) return null
  try {
    const res = await (await caches.open(FILES)).match(key(id))
    return res ? await res.blob() : null
  } catch {
    return null
  }
}

export async function removeFile(id: string) {
  if (!cacheAvailable()) return
  await (await caches.open(FILES)).delete(key(id))
}

export function saveSnapshot(data: TripData) {
  try {
    localStorage.setItem(SNAPSHOT, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
  } catch {
    /* storage full or blocked: offline view just won't be available */
  }
}

export function loadSnapshot(): (TripData & { savedAt: string }) | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT)
  } catch {
    /* ignore */
  }
}

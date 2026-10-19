import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Item, Trip } from '../types'
import { SEED_ITEMS, SEED_TRIP } from './seed'

export interface Backend {
  mode: 'local' | 'supabase'
  /** True when the unlock screen must ask for the email as well as the password. */
  asksEmail: boolean
  isUnlocked(): Promise<boolean>
  unlock(password: string, email?: string): Promise<void>
  lock(): Promise<void>
  load(): Promise<{ trip: Trip; items: Item[] }>
  saveItem(item: Item): Promise<void>
  deleteItem(id: string): Promise<void>
  /** Calls back whenever someone else changes the trip. Returns an unsubscribe function. */
  subscribe(tripId: string, onChange: () => void): () => void
}

// ---------- Local (browser only) ----------

const LOCAL_KEY = 'iku:v1'

function localBackend(): Backend {
  const read = (): { trip: Trip; items: Item[] } => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* fall through to seed */
    }
    return { trip: SEED_TRIP, items: SEED_ITEMS }
  }
  const write = (data: { trip: Trip; items: Item[] }) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }
  return {
    mode: 'local',
    asksEmail: false,
    isUnlocked: async () => true,
    unlock: async () => {},
    lock: async () => {},
    load: async () => read(),
    saveItem: async (item) => {
      const data = read()
      const i = data.items.findIndex((x) => x.id === item.id)
      if (i >= 0) data.items[i] = item
      else data.items.push(item)
      write(data)
    },
    deleteItem: async (id) => {
      const data = read()
      write({ ...data, items: data.items.filter((x) => x.id !== id) })
    },
    subscribe: () => () => {}
  }
}

// ---------- Supabase ----------

interface ItemRow {
  id: string
  trip_id: string
  title: string
  url: string | null
  note: string | null
  type: Item['type']
  tags: string[]
  day: string | null
  time: string | null
  booked: boolean
  booking_ref: string | null
  place: string | null
  lat: number | null
  lng: number | null
  sort: number
  created_at: string
}

const fromRow = (r: ItemRow): Item => ({
  id: r.id,
  tripId: r.trip_id,
  title: r.title,
  url: r.url,
  note: r.note,
  type: r.type,
  tags: r.tags ?? [],
  day: r.day,
  time: r.time ? r.time.slice(0, 5) : null,
  booked: r.booked,
  bookingRef: r.booking_ref,
  place: r.place,
  lat: r.lat,
  lng: r.lng,
  sort: r.sort,
  createdAt: r.created_at
})

const toRow = (i: Item): ItemRow => ({
  id: i.id,
  trip_id: i.tripId,
  title: i.title,
  url: i.url,
  note: i.note,
  type: i.type,
  tags: i.tags,
  day: i.day,
  time: i.time,
  booked: i.booked,
  booking_ref: i.bookingRef,
  place: i.place,
  lat: i.lat,
  lng: i.lng,
  sort: i.sort,
  created_at: i.createdAt
})

function supabaseBackend(sb: SupabaseClient, tripEmail: string | undefined): Backend {
  const must = <T>(res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message)
    return res.data
  }
  return {
    mode: 'supabase',
    asksEmail: !tripEmail,
    isUnlocked: async () => !!(await sb.auth.getSession()).data.session,
    unlock: async (password, email) => {
      const { error } = await sb.auth.signInWithPassword({ email: (tripEmail ?? email ?? '').trim(), password })
      if (error) throw new Error(tripEmail ? 'That password didn’t work.' : 'That email and password didn’t work.')
    },
    lock: async () => {
      await sb.auth.signOut()
    },
    load: async () => {
      // One trip for now: the earliest one. A trip switcher can pick by id later.
      const trips = must(await sb.from('trips').select('*').order('start_date').limit(1)) ?? []
      if (!trips.length) throw new Error('No trip yet. Add a row to the trips table (see supabase/schema.sql).')
      const t = trips[0]
      const trip: Trip = { id: t.id, name: t.name, startDate: t.start_date, endDate: t.end_date }
      const rows = (must(await sb.from('items').select('*').eq('trip_id', trip.id)) ?? []) as ItemRow[]
      return { trip, items: rows.map(fromRow) }
    },
    saveItem: async (item) => {
      must(await sb.from('items').upsert(toRow(item)))
    },
    deleteItem: async (id) => {
      must(await sb.from('items').delete().eq('id', id))
    },
    subscribe: (tripId, onChange) => {
      const ch = sb
        .channel('items-' + tripId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `trip_id=eq.${tripId}` }, onChange)
        .subscribe()
      return () => {
        sb.removeChannel(ch)
      }
    }
  }
}

export function createBackend(): Backend {
  const env = import.meta.env
  const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY) as string | undefined
  const email = (env.VITE_TRIP_EMAIL || env.NEXT_PUBLIC_TRIP_EMAIL) as string | undefined
  if (url && key) return supabaseBackend(createClient(url, key), email || undefined)
  return localBackend()
}

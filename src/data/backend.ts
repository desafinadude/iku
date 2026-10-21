import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Attachment, DayInfo, Item, Label, Member, PanelColors, Trip } from '../types'
import { clearSnapshot, removeFile, savedFileIds } from './offline'
import { cleanTags } from '../lib'
import { normalizeItem } from './normalize'
import { LOCAL_ME, SEED_DAYS, SEED_ITEMS, SEED_MEMBERS, SEED_TRIP } from './seed'

export interface TripData {
  trip: Trip
  items: Item[]
  members: Member[]
  attachments: Attachment[]
  labels: Label[]
  days: DayInfo[]
}

export type Profile = Pick<Member, 'name' | 'avatar' | 'color'>

/** What a link's page says about itself. Any field may be missing. */
export interface LinkPreview {
  title: string | null
  image: string | null
  lat: number | null
  lng: number | null
  description?: string | null
  /** Where a saved post points (a Pinterest pin's original link). */
  sourceUrl?: string | null
  /** The cleaned-up URL of the page itself (e.g. the full pin link for a pin.it short link). */
  pageUrl?: string | null
}

export interface Backend {
  mode: 'local' | 'supabase'
  /** True when the unlock screen must ask for the email as well as the password. */
  asksEmail: boolean
  isUnlocked(): Promise<boolean>
  unlock(password: string, email?: string): Promise<void>
  lock(): Promise<void>
  /** Email of the signed-in member. */
  me(): Promise<string>
  load(): Promise<TripData>
  saveProfile(profile: Profile): Promise<void>
  /** Fetches title/image/coordinates for a link via the unfurl edge function. */
  unfurl(url: string): Promise<LinkPreview | null>
  /** Uploads a file onto an entry, or trip-wide when itemId is null. */
  uploadAttachment(tripId: string, itemId: string | null, file: File): Promise<Attachment>
  deleteAttachment(a: Attachment): Promise<void>
  downloadAttachment(a: Attachment): Promise<Blob>
  /** A link to open the file in a new tab (short-lived for Supabase). */
  attachmentUrl(a: Attachment): Promise<string>
  /** Creates or updates type/tag styles. */
  saveLabels(labels: Label[]): Promise<void>
  deleteLabel(id: string): Promise<void>
  /** Renames (or merges into an existing name) a type or tag on every entry. */
  renameLabel(tripId: string, kind: Label['kind'], from: string, to: string): Promise<void>
  /** Removes a tag from every entry. */
  deleteTag(tripId: string, tag: string): Promise<void>
  /** Saves day titles/tags/colours (a day with nothing set is cleared). */
  saveDays(tripId: string, days: DayInfo[]): Promise<void>
  /** Sets (or clears, with null) the trip's page background. */
  saveBackground(tripId: string, background: string | null): Promise<void>
  /** Sets the Ideas, Days and Map panel colours. */
  savePanels(tripId: string, panels: PanelColors): Promise<void>
  /** Renames the trip or changes its dates. */
  saveTrip(tripId: string, patch: { name: string; startDate: string; endDate: string }): Promise<void>
  /** Stores a card image you chose; returns the reference to save as the entry's imageUrl. */
  uploadCover(tripId: string, file: File): Promise<string>
  /** A displayable URL for an uploaded card image reference. */
  coverUrl(ref: string): Promise<string>
  deleteCover(ref: string): Promise<void>
  saveItem(item: Item): Promise<void>
  deleteItem(id: string): Promise<void>
  /** Calls back whenever someone else changes the trip. Returns an unsubscribe function. */
  subscribe(tripId: string, onChange: () => void): () => void
}

// ---------- Local (browser only) ----------

const LOCAL_KEY = 'iku:v1'
const LOCAL_FILES = 'iku-local-files'
/** imageUrl values starting with this point at an uploaded image in the private bucket, not the web. */
export const COVER_PREFIX = 'storage:'
export const isCoverRef = (url: string | null | undefined): url is string => !!url && url.startsWith(COVER_PREFIX)
const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_').slice(-80)

/** Removes this device's offline copies when someone signs out. */
async function forgetDevice() {
  clearSnapshot()
  for (const id of await savedFileIds()) await removeFile(id)
}

async function downloadLocal(a: Attachment) {
  const res = await (await caches.open(LOCAL_FILES)).match('/' + a.path)
  if (!res) throw new Error('That file isn’t in this browser any more.')
  return res.blob()
}

function localBackend(): Backend {
  const read = (): TripData => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        return { members: SEED_MEMBERS, attachments: [], labels: [], days: [], ...data, items: (data.items ?? []).map(normalizeItem) }
      }
    } catch {
      /* fall through to seed */
    }
    return { trip: SEED_TRIP, items: SEED_ITEMS, members: SEED_MEMBERS, attachments: [], labels: [], days: SEED_DAYS }
  }
  const write = (data: TripData) => {
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
    me: async () => LOCAL_ME,
    unfurl: async () => null,
    load: async () => read(),
    saveProfile: async (profile) => {
      const data = read()
      write({ ...data, members: data.members.map((m) => (m.email === LOCAL_ME ? { ...m, ...profile } : m)) })
    },
    saveItem: async (item) => {
      const data = read()
      const i = data.items.findIndex((x) => x.id === item.id)
      const stamped = { ...item, createdBy: i >= 0 ? data.items[i].createdBy : LOCAL_ME, updatedBy: LOCAL_ME, updatedAt: new Date().toISOString() }
      if (i >= 0) data.items[i] = stamped
      else data.items.push(stamped)
      write(data)
    },
    deleteItem: async (id) => {
      const data = read()
      write({ ...data, items: data.items.filter((x) => x.id !== id), attachments: data.attachments.filter((a) => a.itemId !== id) })
    },
    uploadAttachment: async (tripId, itemId, file) => {
      const id = crypto.randomUUID()
      const a: Attachment = { id, tripId, itemId, path: `${tripId}/${itemId ?? 'trip'}/${id}-${safeName(file.name)}`, name: file.name, mime: file.type || null, size: file.size, createdBy: LOCAL_ME, createdAt: new Date().toISOString() }
      await (await caches.open(LOCAL_FILES)).put('/' + a.path, new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }))
      const data = read()
      write({ ...data, attachments: [...data.attachments, a] })
      return a
    },
    deleteAttachment: async (a) => {
      await (await caches.open(LOCAL_FILES)).delete('/' + a.path)
      const data = read()
      write({ ...data, attachments: data.attachments.filter((x) => x.id !== a.id) })
    },
    downloadAttachment: downloadLocal,
    attachmentUrl: async (a) => URL.createObjectURL(await downloadLocal(a)),
    saveLabels: async (labels) => {
      const data = read()
      const byId = new Map(data.labels.map((l) => [l.id, l]))
      labels.forEach((l) => byId.set(l.id, l))
      write({ ...data, labels: [...byId.values()] })
    },
    deleteLabel: async (id) => {
      const data = read()
      write({ ...data, labels: data.labels.filter((l) => l.id !== id) })
    },
    renameLabel: async (_tripId, _kind, from, to) => {
      const data = read()
      const items = data.items.map((x) =>
        x.tags.includes(from) ? { ...x, tags: cleanTags(x.tags.map((t) => (t === from ? to : t))) } : x
      )
      const exists = data.labels.some((l) => l.name === to)
      const labels = exists ? data.labels.filter((l) => l.name !== from) : data.labels.map((l) => (l.name === from ? { ...l, name: to } : l))
      write({ ...data, items, labels })
    },
    saveTrip: async (_tripId, patch) => {
      const data = read()
      write({ ...data, trip: { ...data.trip, ...patch } })
    },
    saveBackground: async (_tripId, background) => {
      const data = read()
      write({ ...data, trip: { ...data.trip, background } })
    },
    savePanels: async (_tripId, panels) => {
      const data = read()
      write({ ...data, trip: { ...data.trip, panels } })
    },
    saveDays: async (_tripId, days) => {
      const data = read()
      const byDay = new Map(data.days.map((d) => [d.day, d]))
      days.forEach((d) => (d.title || d.tag || d.color || d.image || d.headerColor || d.blendColor || d.headerText || d.columnStrength != null ? byDay.set(d.day, d) : byDay.delete(d.day)))
      write({ ...data, days: [...byDay.values()] })
    },
    uploadCover: async (tripId, file) => {
      const path = `${tripId}/covers/${crypto.randomUUID()}-${safeName(file.name)}`
      await (await caches.open(LOCAL_FILES)).put('/' + path, new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }))
      return COVER_PREFIX + path
    },
    coverUrl: async (ref) => {
      const res = await (await caches.open(LOCAL_FILES)).match('/' + ref.slice(COVER_PREFIX.length))
      if (!res) throw new Error('Image not found')
      return URL.createObjectURL(await res.blob())
    },
    deleteCover: async (ref) => {
      await (await caches.open(LOCAL_FILES)).delete('/' + ref.slice(COVER_PREFIX.length))
    },
    deleteTag: async (_tripId, tag) => {
      const data = read()
      write({ ...data, items: data.items.map((x) => ({ ...x, tags: x.tags.filter((t) => t !== tag) })), labels: data.labels.filter((l) => !(l.kind === 'tag' && l.name === tag)) })
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
  image_url?: string | null
  note: string | null
  type?: string | null
  tags: string[]
  day: string | null
  end_day?: string | null
  time: string | null
  end_time?: string | null
  part?: string | null
  booked: boolean
  pinned?: boolean | null
  chapter?: boolean | null
  people?: string[] | null
  booking_ref: string | null
  place: string | null
  place_id?: string | null
  lat: number | null
  lng: number | null
  sort: number
  created_at: string
  created_by?: string | null
  updated_by?: string | null
  updated_at?: string | null
}

interface AttachmentRow {
  id: string
  trip_id: string
  item_id: string | null
  path: string
  name: string
  mime: string | null
  size: number | null
  created_by: string | null
  created_at: string
}

const fromAttachmentRow = (r: AttachmentRow): Attachment => ({
  id: r.id,
  tripId: r.trip_id,
  itemId: r.item_id,
  path: r.path,
  name: r.name,
  mime: r.mime,
  size: r.size,
  createdBy: r.created_by,
  createdAt: r.created_at
})

interface LabelRow {
  id: string
  trip_id: string
  kind: Label['kind']
  name: string
  color: string | null
  icon: string | null
  icon_color?: string | null
  sort: number
}

const fromLabelRow = (r: LabelRow): Label => ({ id: r.id, tripId: r.trip_id, kind: r.kind, name: r.name, color: r.color, icon: r.icon, iconColor: r.icon_color ?? null, sort: r.sort })
const toLabelRow = (l: Label): LabelRow => ({ id: l.id, trip_id: l.tripId, kind: l.kind, name: l.name, color: l.color, icon: l.icon, icon_color: l.iconColor ?? null, sort: l.sort })

const LABELS_MIGRATION = 'Run supabase/migrations/006_labels.sql to manage types and tags.'

interface MemberRow {
  email: string
  name?: string | null
  avatar?: string | null
  color?: string | null
}

const fromRow = (r: ItemRow): Item => normalizeItem({
  type: r.type,
  id: r.id,
  tripId: r.trip_id,
  title: r.title,
  url: r.url,
  imageUrl: r.image_url || null,
  note: r.note,
  tags: r.tags ?? [],
  day: r.day,
  endDay: r.end_day ?? null,
  time: r.time ? r.time.slice(0, 5) : null,
  endTime: r.end_time ? r.end_time.slice(0, 5) : null,
  part: (r.part as Item['part']) || null,
  booked: r.booked,
  pinned: !!r.pinned,
  chapter: !!r.chapter,
  people: r.people ?? [],
  bookingRef: r.booking_ref,
  place: r.place,
  placeId: r.place_id || null,
  lat: r.lat,
  lng: r.lng,
  sort: r.sort,
  createdAt: r.created_at,
  createdBy: r.created_by ?? null,
  updatedBy: r.updated_by ?? null,
  updatedAt: r.updated_at ?? null
})

const toRow = (i: Item, hasEndDay: boolean, hasEndTime: boolean, hasPinned: boolean, hasPart: boolean, hasChapter: boolean, hasPeople: boolean): ItemRow => ({
  id: i.id,
  trip_id: i.tripId,
  title: i.title,
  url: i.url,
  // Only sent when there's something to store, so saving still works before migration 003.
  // Clearing an image sends '' (read back as no image).
  ...(i.imageUrl !== null ? { image_url: i.imageUrl } : {}),
  note: i.note,
  // Types are now tags; the column stays empty so a removed tag never comes back from it.
  type: '',
  tags: i.tags,
  day: i.day,
  // end_day only exists after migration 004; leave it out before that so saving keeps working.
  ...(hasEndDay ? { end_day: i.endDay } : {}),
  time: i.time,
  // end_time only exists after migration 007.
  ...(hasEndTime ? { end_time: i.endTime } : {}),
  // part only exists after migration 012.
  ...(hasPart ? { part: i.part } : {}),
  booked: i.booked,
  // pinned only exists after migration 011.
  ...(hasPinned ? { pinned: i.pinned } : {}),
  // chapter only exists after migration 014.
  ...(hasChapter ? { chapter: i.chapter } : {}),
  // people only exists after migration 016.
  ...(hasPeople ? { people: i.people } : {}),
  booking_ref: i.bookingRef,
  place: i.place,
  // Only sent when set, so saving works before migration 005; clearing sends ''.
  ...(i.placeId !== null ? { place_id: i.placeId } : {}),
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
  const files = () => sb.storage.from('attachments')
  let hasEndDay = false
  let hasEndTime = false
  let hasPinned = false
  let hasPart = false
  let hasChapter = false
  let hasPeople = false
  let attachments: Attachment[] = []
  return {
    mode: 'supabase',
    asksEmail: !tripEmail,
    isUnlocked: async () => !!(await sb.auth.getSession()).data.session,
    unlock: async (password, email) => {
      const { error } = await sb.auth.signInWithPassword({ email: (tripEmail ?? email ?? '').trim(), password })
      if (error) throw new Error(tripEmail ? 'That password didn’t work.' : 'That email and password didn’t work.')
    },
    lock: async () => {
      await forgetDevice()
      await sb.auth.signOut()
    },
    me: async () => (await sb.auth.getSession()).data.session?.user.email ?? '',
    load: async () => {
      // One trip for now: the earliest one. A trip switcher can pick by id later.
      const trips = must(await sb.from('trips').select('*').order('start_date').limit(1)) ?? []
      if (!trips.length) throw new Error('No trip yet. Add a row to the trips table (see supabase/schema.sql).')
      const t = trips[0]
      const trip: Trip = { id: t.id, name: t.name, startDate: t.start_date, endDate: t.end_date, background: t.background ?? null, panels: t.panels ?? null }
      const [rows, memberRows, attachmentRes, endDayProbe, labelRes, endTimeProbe, dayRes, pinnedProbe, partProbe, chapterProbe, peopleProbe] = await Promise.all([
        sb.from('items').select('*').eq('trip_id', trip.id).then(must),
        sb.from('trip_members').select('*').then(must),
        sb.from('attachments').select('*').eq('trip_id', trip.id), // missing before migration 004
        sb.from('items').select('end_day').limit(1),
        sb.from('labels').select('*').eq('trip_id', trip.id), // missing before migration 006
        sb.from('items').select('end_time').limit(1),
        sb.from('trip_days').select('*').eq('trip_id', trip.id), // missing before migration 009
        sb.from('items').select('pinned').limit(1), // missing before migration 011
        sb.from('items').select('part').limit(1), // missing before migration 012
        sb.from('items').select('chapter').limit(1), // missing before migration 014
        sb.from('items').select('people').limit(1) // missing before migration 016
      ])
      const days: DayInfo[] = dayRes.error ? [] : ((dayRes.data ?? []) as DayInfo[]).map((d) => { const r = d as DayInfo & { header_color?: string | null; blend_color?: string | null; header_text?: string | null; column_strength?: number | null }; return { day: r.day, title: r.title, tag: r.tag, color: r.color, image: r.image ?? null, headerColor: r.header_color ?? null, blendColor: r.blend_color ?? null, headerText: r.header_text ?? null, columnStrength: r.column_strength ?? null } })
      hasEndTime = !endTimeProbe.error
      hasPinned = !pinnedProbe.error
      hasPart = !partProbe.error
      hasChapter = !chapterProbe.error
      hasPeople = !peopleProbe.error
      const labels = labelRes.error ? [] : ((labelRes.data ?? []) as LabelRow[]).map(fromLabelRow)
      hasEndDay = !endDayProbe.error
      attachments = attachmentRes.error ? [] : ((attachmentRes.data ?? []) as AttachmentRow[]).map(fromAttachmentRow)
      const members = ((memberRows ?? []) as MemberRow[]).map((m) => ({ email: m.email, name: m.name ?? null, avatar: m.avatar ?? null, color: m.color ?? null }))
      return { trip, items: ((rows ?? []) as ItemRow[]).map(fromRow), members, attachments, labels, days }
    },
    saveProfile: async (profile) => {
      const email = (await sb.auth.getSession()).data.session?.user.email
      const res = await sb.from('trip_members').update(profile).eq('email', email).select()
      if (res.error) throw new Error(/column/.test(res.error.message) ? 'Run supabase/migrations/002_members.sql first.' : res.error.message)
      if (!res.data?.length) throw new Error('Couldn’t save your profile. Run supabase/migrations/002_members.sql first.')
    },
    saveItem: async (item) => {
      if (item.endDay && !hasEndDay) throw new Error('Run supabase/migrations/004_attachments_and_spans.sql to save multi-day entries.')
      if (item.endTime && !hasEndTime) throw new Error('Run supabase/migrations/007_end_time.sql to save end times.')
      if (item.pinned && !hasPinned) throw new Error('Run supabase/migrations/011_pinned.sql to pin entries to the top.')
      if (item.part && !hasPart) throw new Error('Run supabase/migrations/012_day_parts.sql to place entries in a part of the day.')
      if (item.chapter && !hasChapter) throw new Error('Run supabase/migrations/014_title_cards.sql to make title cards.')
      if (item.people.length && !hasPeople) throw new Error('Run supabase/migrations/016_people_on_entries.sql to add people to entries.')
      const res = await sb.from('items').upsert(toRow(item, hasEndDay, hasEndTime, hasPinned, hasPart, hasChapter, hasPeople))
      if (res.error && /items_type_check/.test(res.error.message)) throw new Error('Run supabase/migrations/006_labels.sql to use your own types.')
      if (res.error && /place_id/.test(res.error.message)) throw new Error('Run supabase/migrations/005_google_places.sql to save Google places.')
      if (res.error && /image_url/.test(res.error.message)) throw new Error('Run supabase/migrations/003_link_previews.sql to save preview images.')
      must(res)
    },
    unfurl: async (url) => {
      const { data, error } = await sb.functions.invoke('unfurl', { body: { url } })
      if (error || !data || data.error) return null
      return { title: data.title ?? null, image: data.image ?? null, lat: data.lat ?? null, lng: data.lng ?? null, description: data.description ?? null, sourceUrl: data.sourceUrl ?? null, pageUrl: data.url ?? null }
    },
    deleteItem: async (id) => {
      // Rows cascade in the database, but the files themselves have to be removed from storage.
      const paths = attachments.filter((a) => a.itemId === id).map((a) => a.path)
      if (paths.length) await files().remove(paths)
      must(await sb.from('items').delete().eq('id', id))
    },
    uploadAttachment: async (tripId, itemId, file) => {
      const path = `${tripId}/${itemId ?? 'trip'}/${crypto.randomUUID()}-${safeName(file.name)}`
      const up = await files().upload(path, file, { contentType: file.type || undefined })
      if (up.error) {
        if (/bucket/i.test(up.error.message)) throw new Error('Run supabase/migrations/004_attachments_and_spans.sql to enable attachments.')
        if (/size|large/i.test(up.error.message)) throw new Error(`${file.name} is too big (50 MB max).`)
        throw new Error(up.error.message)
      }
      const res = await sb.from('attachments').insert({ trip_id: tripId, item_id: itemId, path, name: file.name, mime: file.type || null, size: file.size }).select().single()
      if (res.error) {
        await files().remove([path])
        throw new Error(res.error.message)
      }
      const a = fromAttachmentRow(res.data as AttachmentRow)
      attachments = [...attachments, a]
      return a
    },
    deleteAttachment: async (a) => {
      await files().remove([a.path])
      must(await sb.from('attachments').delete().eq('id', a.id))
      attachments = attachments.filter((x) => x.id !== a.id)
    },
    downloadAttachment: async (a) => {
      const { data, error } = await files().download(a.path)
      if (error || !data) throw new Error('Couldn’t download that file.')
      return data
    },
    attachmentUrl: async (a) => {
      const { data, error } = await files().createSignedUrl(a.path, 3600)
      if (error || !data) throw new Error('Couldn’t open that file.')
      return data.signedUrl
    },
    saveLabels: async (labels) => {
      let res = await sb.from('labels').upsert(labels.map(toLabelRow))
      // Before migration 013 there is no icon_color column: styles without an icon colour still save.
      if (res.error && /icon_color/.test(res.error.message)) {
        if (labels.some((l) => l.iconColor)) throw new Error('Run supabase/migrations/013_icon_colour_and_background.sql to choose icon colours.')
        res = await sb.from('labels').upsert(labels.map(toLabelRow).map(({ icon_color: _ic, ...r }) => r))
      }
      if (res.error) throw new Error(/labels/.test(res.error.message) ? LABELS_MIGRATION : res.error.message)
    },
    deleteLabel: async (id) => {
      must(await sb.from('labels').delete().eq('id', id))
    },
    renameLabel: async (tripId, kind, from, to) => {
      const res = await sb.rpc('rename_label', { p_trip: tripId, p_kind: kind, p_from: from, p_to: to })
      if (res.error) throw new Error(/function|rename_label/.test(res.error.message) ? LABELS_MIGRATION : res.error.message)
    },
    saveTrip: async (tripId, patch) => {
      const rows = must(await sb.from('trips').update({ name: patch.name, start_date: patch.startDate, end_date: patch.endDate }).eq('id', tripId).select())
      if (!rows?.length) throw new Error('Couldn’t change the trip: your account may not be allowed to edit it.')
    },
    saveBackground: async (tripId, background) => {
      const res = await sb.from('trips').update({ background }).eq('id', tripId)
      if (res.error) throw new Error(/background/.test(res.error.message) ? 'Run supabase/migrations/013_icon_colour_and_background.sql to set a trip background.' : res.error.message)
    },
    savePanels: async (tripId, panels) => {
      const res = await sb.from('trips').update({ panels }).eq('id', tripId)
      if (res.error) throw new Error(/panels/.test(res.error.message) ? 'Run supabase/migrations/019_panel_colours.sql to colour the panels.' : res.error.message)
    },
    saveDays: async (tripId, days) => {
      const has = (d: DayInfo) => !!(d.title || d.tag || d.color || d.image || d.headerColor || d.blendColor || d.headerText || d.columnStrength != null)
      const keep = days.filter(has)
      const clear = days.filter((d) => !has(d)).map((d) => d.day)
      const migrate = 'Run supabase/migrations/009_trip_days.sql to save day titles and colours.'
      if (keep.length) {
        const rows = keep.map((d) => ({ trip_id: tripId, day: d.day, title: d.title, tag: d.tag, color: d.color, image: d.image ?? null, header_color: d.headerColor ?? null, blend_color: d.blendColor ?? null, header_text: d.headerText ?? null, column_strength: d.columnStrength ?? null }))
        let res = await sb.from('trip_days').upsert(rows)
        // Older databases lack the newer columns: days that don't use them still save.
        if (res.error && /column_strength/.test(res.error.message)) {
          if (keep.some((d) => d.columnStrength != null)) throw new Error('Run supabase/migrations/018_day_column_strength.sql to save column strength.')
          res = await sb.from('trip_days').upsert(rows.map(({ column_strength: _s, ...r }) => r))
        }
        if (res.error && /header_text/.test(res.error.message)) {
          if (keep.some((d) => d.headerText)) throw new Error('Run supabase/migrations/017_day_header_text.sql to save header text colours.')
          res = await sb.from('trip_days').upsert(rows.map(({ header_text: _t, column_strength: _s, ...r }) => r))
        }
        if (res.error && /header_color|blend_color/.test(res.error.message)) {
          if (keep.some((d) => d.headerColor || d.blendColor)) throw new Error('Run supabase/migrations/015_day_header_and_blend.sql to save header and blend colours.')
          res = await sb.from('trip_days').upsert(rows.map(({ header_color: _h, blend_color: _b, header_text: _t, column_strength: _s, ...r }) => r))
        }
        if (res.error && /image/.test(res.error.message)) {
          if (keep.some((d) => d.image)) throw new Error('Run supabase/migrations/010_day_images.sql to save opening images for days.')
          res = await sb.from('trip_days').upsert(rows.map(({ image: _image, header_color: _h, blend_color: _b, header_text: _t, column_strength: _s, ...r }) => r))
        }
        if (res.error) throw new Error(/trip_days/.test(res.error.message) ? migrate : res.error.message)
      }
      if (clear.length) {
        const res = await sb.from('trip_days').delete().eq('trip_id', tripId).in('day', clear)
        if (res.error) throw new Error(/trip_days/.test(res.error.message) ? migrate : res.error.message)
      }
    },
    uploadCover: async (tripId, file) => {
      const path = `${tripId}/covers/${crypto.randomUUID()}-${safeName(file.name)}`
      const up = await files().upload(path, file, { contentType: file.type || 'image/jpeg' })
      if (up.error) throw new Error(/bucket/i.test(up.error.message) ? 'Run supabase/migrations/004_attachments_and_spans.sql to upload images.' : up.error.message)
      return COVER_PREFIX + path
    },
    coverUrl: async (ref) => {
      const { data, error } = await files().createSignedUrl(ref.slice(COVER_PREFIX.length), 3600)
      if (error || !data) throw new Error('Couldn’t load that image.')
      return data.signedUrl
    },
    deleteCover: async (ref) => {
      await files().remove([ref.slice(COVER_PREFIX.length)])
    },
    deleteTag: async (tripId, tag) => {
      const res = await sb.rpc('delete_tag', { p_trip: tripId, p_tag: tag })
      if (res.error) throw new Error(/function|delete_tag/.test(res.error.message) ? LABELS_MIGRATION : res.error.message)
    },
    subscribe: (tripId, onChange) => {
      const ch = sb
        .channel('items-' + tripId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `trip_id=eq.${tripId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments', filter: `trip_id=eq.${tripId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'labels', filter: `trip_id=eq.${tripId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_days', filter: `trip_id=eq.${tripId}` }, onChange)
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

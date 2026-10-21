import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, daysBetween, partOfTime } from '../lib'
import type { Attachment, DayInfo, DayPart, Item, Label, Member, Trip } from '../types'
import { isCoverRef, type Backend, type Profile } from './backend'
import { getFile, loadSnapshot, removeFile, saveFile, saveSnapshot, savedFileIds } from './offline'

export function useTrip(backend: Backend, enabled: boolean) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [dayInfos, setDayInfos] = useState<DayInfo[]>([])
  const [me, setMe] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** Set when showing the last synced copy because the network is down. */
  const [offlineSince, setOfflineSince] = useState<string | null>(null)
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const reload = useCallback(async () => {
    try {
      const [data, email] = await Promise.all([backend.load(), backend.me()])
      setTrip(data.trip)
      setItems(data.items)
      setMembers(data.members)
      setAttachments(data.attachments)
      setLabels(data.labels)
      setDayInfos(data.days ?? [])
      setMe(email)
      setError(null)
      setOfflineSince(null)
      if (backend.mode === 'supabase') saveSnapshot(data)
    } catch (e) {
      const snap = backend.mode === 'supabase' ? loadSnapshot() : null
      if (snap && (!navigator.onLine || /fetch|network/i.test((e as Error).message))) {
        setTrip(snap.trip)
        setItems(snap.items)
        setMembers(snap.members)
        setAttachments(snap.attachments ?? [])
        setLabels(snap.labels ?? [])
        setDayInfos(snap.days ?? [])
        setMe(await backend.me().catch(() => ''))
        setOfflineSince(snap.savedAt)
      } else {
        setError((e as Error).message)
      }
    }
  }, [backend])

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

  useEffect(() => {
    savedFileIds().then(setOfflineIds)
  }, [])

  // Back online: fetch fresh data.
  useEffect(() => {
    window.addEventListener('online', reload)
    return () => window.removeEventListener('online', reload)
  }, [reload])

  useEffect(() => {
    if (!enabled || !trip) return
    return backend.subscribe(trip.id, reload)
  }, [backend, enabled, trip, reload])

  // Optimistic: update the screen first, then persist; roll back on failure.
  const save = useCallback(
    async (item: Item) => {
      const before = itemsRef.current
      setItems((xs) => (xs.some((x) => x.id === item.id) ? xs.map((x) => (x.id === item.id ? item : x)) : [...xs, item]))
      try {
        await backend.saveItem(item)
        // An uploaded card image that was replaced or removed is deleted from storage.
        const prev = before.find((x) => x.id === item.id)?.imageUrl
        if (isCoverRef(prev) && prev !== item.imageUrl) backend.deleteCover(prev).catch(() => {})
        return true
      } catch (e) {
        setItems(before)
        setError((e as Error).message)
        return false
      }
    },
    [backend]
  )

  const remove = useCallback(
    async (id: string) => {
      const before = itemsRef.current
      setItems((xs) => xs.filter((x) => x.id !== id))
      setAttachments((as) => as.filter((a) => a.itemId !== id))
      try {
        await backend.deleteItem(id)
        const cover = before.find((x) => x.id === id)?.imageUrl
        if (isCoverRef(cover)) backend.deleteCover(cover).catch(() => {})
      } catch (e) {
        setItems(before)
        setError((e as Error).message)
        reload()
      }
    },
    [backend, reload]
  )

  /** Moves an entry to a day (or back to Ideas), keeping a multi-day entry's length. */
  const moveTo = useCallback(
    (id: string, day: string | null) => {
      const item = itemsRef.current.find((x) => x.id === id)
      if (!item || item.day === day) return
      const sort = Math.max(0, ...itemsRef.current.filter((x) => x.day === day).map((x) => x.sort)) + 1
      const endDay = day && item.day && item.endDay ? addDays(day, daysBetween(item.day, item.endDay)) : null
      save({ ...item, day, endDay, sort })
    },
    [save]
  )

  /**
   * Drops an entry just before or after another card. `list` is the target's list as shown (a day's own
   * entries, or the ideas); the entry joins it on `day`. Only the moved entry is saved when the list is already
   * in its stored order; otherwise the whole list is renumbered in the order shown.
   */
  const arrange = useCallback(
    (id: string, list: Item[], targetId: string, after: boolean, day: string | null, patch: Partial<Item> = {}) => {
      const item = itemsRef.current.find((x) => x.id === id)
      if (!item || id === targetId) return
      const rest = list.filter((x) => x.id !== id)
      let at = rest.findIndex((x) => x.id === targetId)
      if (at < 0) return
      if (after) at++
      const endDay = day && item.day && item.endDay ? addDays(day, daysBetween(item.day, item.endDay)) : null
      const moved = { ...item, day, endDay, ...patch }
      const inOrder = rest.every((x, i) => i === 0 || rest[i - 1].sort < x.sort)
      if (inOrder) {
        const prev = rest[at - 1]
        const next = rest[at]
        const sort = prev && next ? (prev.sort + next.sort) / 2 : prev ? prev.sort + 1 : next ? next.sort - 1 : 0
        save({ ...moved, sort })
        return
      }
      const next = [...rest.slice(0, at), moved, ...rest.slice(at)]
      next.forEach((x, i) => {
        if (x === moved || x.sort !== i + 1) save({ ...x, sort: i + 1 })
      })
    },
    [save]
  )

  /**
   * Drops an entry into a part of a day (or "All day" with null). An exact time that falls in that part is kept;
   * otherwise the time is cleared and the entry just sits in that part.
   */
  const placeIn = useCallback(
    (id: string, day: string, part: DayPart | null) => {
      const item = itemsRef.current.find((x) => x.id === id)
      if (!item) return
      const keepTime = !!item.time && part !== null && partOfTime(item.time) === part
      const endDay = item.day && item.endDay ? addDays(day, daysBetween(item.day, item.endDay)) : null
      const next = { ...item, day, endDay, part: keepTime ? null : part, time: keepTime ? item.time : null, endTime: keepTime ? item.endTime : null }
      if (next.day === item.day && next.part === item.part && next.time === item.time) return
      save(next)
    },
    [save]
  )

  const saveProfile = useCallback(
    async (profile: Profile) => {
      setMembers((ms) => ms.map((m) => (m.email === me ? { ...m, ...profile } : m)))
      try {
        await backend.saveProfile(profile)
      } catch (e) {
        await reload() // undo the optimistic change; reload clears errors, so report after it
        setError((e as Error).message)
      }
    },
    [backend, me, reload]
  )

  const upload = useCallback(
    async (itemId: string | null, files: File[]) => {
      if (!trip) return
      setUploading((n) => n + files.length)
      for (const file of files) {
        try {
          const a = await backend.uploadAttachment(trip.id, itemId, file)
          setAttachments((as) => [...as.filter((x) => x.id !== a.id), a])
        } catch (e) {
          setError((e as Error).message)
        } finally {
          setUploading((n) => n - 1)
        }
      }
    },
    [backend, trip]
  )

  const deleteAttachment = useCallback(
    async (a: Attachment) => {
      setAttachments((as) => as.filter((x) => x.id !== a.id))
      try {
        await backend.deleteAttachment(a)
        await removeFile(a.id)
        setOfflineIds((s) => new Set([...s].filter((id) => id !== a.id)))
      } catch (e) {
        setError((e as Error).message)
        reload()
      }
    },
    [backend, reload]
  )

  const toggleOffline = useCallback(
    async (a: Attachment) => {
      try {
        if (offlineIds.has(a.id)) {
          await removeFile(a.id)
          setOfflineIds((s) => new Set([...s].filter((id) => id !== a.id)))
        } else {
          await saveFile(a.id, await backend.downloadAttachment(a))
          setOfflineIds((s) => new Set([...s, a.id]))
        }
      } catch (e) {
        setError((e as Error).message || 'Couldn’t save that file on this device.')
      }
    },
    [backend, offlineIds]
  )

  /** A URL to view the file: the offline copy when there is one, else a fresh link. */
  const fileUrl = useCallback(
    async (a: Attachment) => {
      const local = await getFile(a.id)
      if (local) return URL.createObjectURL(local)
      return backend.attachmentUrl(a)
    },
    [backend]
  )

  /** Runs a label change, then reloads so entries and styles match the database. */
  const labelOp = useCallback(
    async (op: () => Promise<void>) => {
      try {
        await op()
        await reload()
      } catch (e) {
        await reload()
        setError((e as Error).message)
      }
    },
    [reload]
  )
  const saveLabels = useCallback(
    (ls: Label[]) => {
      setLabels((cur) => {
        const byId = new Map(cur.map((l) => [l.id, l]))
        ls.forEach((l) => byId.set(l.id, l))
        return [...byId.values()]
      })
      return labelOp(() => backend.saveLabels(ls))
    },
    [backend, labelOp]
  )
  const deleteLabel = useCallback((id: string) => labelOp(() => backend.deleteLabel(id)), [backend, labelOp])
  const renameLabel = useCallback(
    (kind: Label['kind'], from: string, to: string) => labelOp(() => backend.renameLabel(trip!.id, kind, from, to)),
    [backend, labelOp, trip]
  )
  const deleteTag = useCallback((tag: string) => labelOp(() => backend.deleteTag(trip!.id, tag)), [backend, labelOp, trip])

  /** Saves titles/tags/colours for one or more days (optimistic). */
  const saveDays = useCallback(
    async (list: DayInfo[]) => {
      const before = dayInfos
      setDayInfos((cur) => {
        const byDay = new Map(cur.map((d) => [d.day, d]))
        list.forEach((d) => byDay.set(d.day, d))
        return [...byDay.values()]
      })
      try {
        await backend.saveDays(trip!.id, list)
      } catch (e) {
        setDayInfos(before)
        setError((e as Error).message)
      }
    },
    [backend, dayInfos, trip]
  )

  /** Renames the trip or changes its dates. */
  const saveTrip = useCallback(
    async (patch: { name: string; startDate: string; endDate: string }) => {
      if (!trip) return false
      const before = trip
      setTrip({ ...trip, ...patch })
      try {
        await backend.saveTrip(trip.id, patch)
        return true
      } catch (e) {
        setTrip(before)
        setError((e as Error).message)
        return false
      }
    },
    [backend, trip]
  )

  /** The trip's page background (shared): a colour, an image, or null for none. */
  const saveBackground = useCallback(
    async (background: string | null) => {
      if (!trip) return
      const before = trip
      setTrip({ ...trip, background })
      try {
        await backend.saveBackground(trip.id, background)
      } catch (e) {
        setTrip(before)
        setError((e as Error).message)
      }
    },
    [backend, trip]
  )

  return {
    dayInfos, saveDays, saveBackground, saveTrip,
    labels, saveLabels, deleteLabel, renameLabel, deleteTag,
    trip, items, members, attachments, me, error, setError, offlineSince, offlineIds, uploading,
    save, remove, moveTo, placeIn, arrange, saveProfile, upload, deleteAttachment, toggleOffline, fileUrl
  }
}

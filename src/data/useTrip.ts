import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, daysBetween } from '../lib'
import type { Attachment, Item, Member, Trip } from '../types'
import type { Backend, Profile } from './backend'
import { getFile, loadSnapshot, removeFile, saveFile, saveSnapshot, savedFileIds } from './offline'

export function useTrip(backend: Backend, enabled: boolean) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
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

  return {
    trip, items, members, attachments, me, error, setError, offlineSince, offlineIds, uploading,
    save, remove, moveTo, saveProfile, upload, deleteAttachment, toggleOffline, fileUrl
  }
}

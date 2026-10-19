import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item, Member, Trip } from '../types'
import type { Backend, Profile } from './backend'

export function useTrip(backend: Backend, enabled: boolean) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState('')
  const [error, setError] = useState<string | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const reload = useCallback(async () => {
    try {
      const [data, email] = await Promise.all([backend.load(), backend.me()])
      setTrip(data.trip)
      setItems(data.items)
      setMembers(data.members)
      setMe(email)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [backend])

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

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
      } catch (e) {
        setItems(before)
        setError((e as Error).message)
      }
    },
    [backend]
  )

  const remove = useCallback(
    async (id: string) => {
      const before = itemsRef.current
      setItems((xs) => xs.filter((x) => x.id !== id))
      try {
        await backend.deleteItem(id)
      } catch (e) {
        setItems(before)
        setError((e as Error).message)
      }
    },
    [backend]
  )

  const moveTo = useCallback(
    (id: string, day: string | null) => {
      const item = itemsRef.current.find((x) => x.id === id)
      if (!item || item.day === day) return
      const sort = Math.max(0, ...itemsRef.current.filter((x) => x.day === day).map((x) => x.sort)) + 1
      save({ ...item, day, sort })
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

  return { trip, items, members, me, error, setError, save, remove, moveTo, saveProfile }
}

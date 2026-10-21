import { useSyncExternalStore } from 'react'

// Colours picked recently, newest first, kept on this device for quick picks in every colour picker.
const KEY = 'iku:recent-colors'
const MAX = 16
let list: string[] = load()
const listeners = new Set<() => void>()

function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((c) => typeof c === 'string' && /^#[0-9A-F]{6}$/.test(c)) : []
  } catch {
    return []
  }
}

export function addRecentColor(color: string) {
  const c = color.toUpperCase()
  if (!/^#[0-9A-F]{6}$/.test(c)) return
  list = [c, ...list.filter((x) => x !== c)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage blocked: keep them for this session */
  }
  listeners.forEach((f) => f())
}

const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
export const useRecentColors = () => useSyncExternalStore(subscribe, () => list)

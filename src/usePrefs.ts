import { useCallback, useState } from 'react'

/** Display choices kept per device (not shared with the rest of the trip). */
export interface Prefs {
  /** Show multi-day entries (e.g. a hotel) only on their first day. */
  hideRepeats: boolean
  /** Show tags on the repeated cards of multi-day entries too. */
  tagsOnRepeats: boolean
  /** How the days are shown: columns (list on phones), hour by hour, or a month calendar. */
  daysView: 'board' | 'hours' | 'month'
}

const KEY = 'iku:prefs'
const DEFAULTS: Prefs = { hideRepeats: false, tagsOnRepeats: false, daysView: 'board' }

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    } catch {
      return DEFAULTS
    }
  })
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* storage blocked: keep for this session */
      }
      return next
    })
  }, [])
  return [prefs, update] as const
}

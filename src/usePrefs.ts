import { useCallback, useState } from 'react'

/** Display choices kept per device (not shared with the rest of the trip). */
export interface Prefs {
  /** Show multi-day entries (e.g. a hotel) only on their first day. */
  hideRepeats: boolean
  /** Show tags on the repeated cards of multi-day entries too. */
  tagsOnRepeats: boolean
  /** How the days are shown: columns (list on phones), hour by hour, or a month calendar. */
  daysView: 'board' | 'hours' | 'month'
  /** Wide screens: the planner (ideas, days, map), a full-width ideas board, or a full-width map. */
  mainView: 'plan' | 'ideas' | 'map'
  /** Ideas board: include entries already on the plan. */
  ideasIncludePlanned: boolean
  /** Order of cards in a day: by time (untimed last), as arranged by dragging, or by title. */
  dayOrder: DayOrder
  /** Order of the ideas. */
  ideasOrder: IdeasOrder
  /** How much each card shows: everything, just titles, or just pictures. */
  daysCards: CardLook
  ideasCards: CardLook
}

export type DayOrder = 'time' | 'custom' | 'title'
export type IdeasOrder = 'newest' | 'oldest' | 'custom' | 'title' | 'tag'
export type CardLook = 'full' | 'titles' | 'pictures'

const KEY = 'iku:prefs'
const DEFAULTS: Prefs = { hideRepeats: false, tagsOnRepeats: false, daysView: 'board', mainView: 'plan', ideasIncludePlanned: false, dayOrder: 'time', ideasOrder: 'newest', daysCards: 'full', ideasCards: 'full' }

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

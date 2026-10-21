import { useCallback, useState } from 'react'

/** Display choices kept per device (not shared with the rest of the trip). */
export interface Prefs {
  /** Show multi-day entries (e.g. a hotel) only on their first day. */
  hideRepeats: boolean
  /** Show tags on the repeated cards of multi-day entries too. */
  tagsOnRepeats: boolean
  /** How the days are shown: columns (list on phones), hour by hour, or a month calendar. */
  /** Wide screens: the planner (ideas, days, map), a full-width ideas board, or a full-width map. */
  mainView: 'plan' | 'ideas' | 'map'
  /** Ideas board: include entries already on the plan. */
  ideasIncludePlanned: boolean
  /** Order of cards in a day: by time (untimed last), as arranged by dragging, or by title. */
  dayOrder: DayOrder
  /** Order of the ideas. */
  ideasOrder: IdeasOrder
  /** Which parts each card shows (days and ideas separately). */
  daysShow: CardShow
  ideasShow: CardShow
  /** Ideas: number of columns (1–5) in the side pane / phone, and on the full Ideas board. */
  ideasCols: number
  boardCols: number
  /** Plan view on wide screens: show the ideas and map panes. */
  planIdeas: boolean
  planMap: boolean
  /** Wide screens: pane widths in px, set by dragging the handles between panes. */
  ideasWidth: number
  mapWidth: number
  detailWidth: number
}

export type DayOrder = 'time' | 'custom' | 'title'
export type IdeasOrder = 'newest' | 'oldest' | 'custom' | 'title' | 'tag'
/** Parts of a card that can be turned on and off. */
export interface CardShow {
  image: boolean
  title: boolean
  /** Time, notes, link, attachments and booking. */
  details: boolean
  /** Tag chips (and who added it) in a bar along the bottom. */
  tags: boolean
  /** A strip of coloured tag-icon squares along the top. */
  tagIcons: boolean
}

export const SHOW_ALL: CardShow = { image: true, title: true, details: true, tags: true, tagIcons: false }

export const PANE_DEFAULTS = { ideas: 320, map: 380, detail: 640 }

const KEY = 'iku:prefs'
const DEFAULTS: Prefs = { hideRepeats: false, tagsOnRepeats: false, mainView: 'plan', ideasIncludePlanned: false, dayOrder: 'time', ideasOrder: 'newest', daysShow: SHOW_ALL, ideasShow: SHOW_ALL, ideasCols: 2, boardCols: 4, planIdeas: true, planMap: true, ideasWidth: PANE_DEFAULTS.ideas, mapWidth: PANE_DEFAULTS.map, detailWidth: PANE_DEFAULTS.detail }

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

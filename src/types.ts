export type ItemType = 'Food' | 'Sight' | 'Stay' | 'Transport' | 'Nature' | 'Shop'

export const ITEM_TYPES: ItemType[] = ['Food', 'Sight', 'Stay', 'Transport', 'Nature', 'Shop']

export const TYPE_COLORS: Record<ItemType, { fg: string; bg: string }> = {
  Food: { fg: '#B4461F', bg: '#FBEDE6' },
  Sight: { fg: '#0E6B60', bg: '#E2F1EC' },
  Stay: { fg: '#3A5BA0', bg: '#E8EEF8' },
  Transport: { fg: '#5F4FA0', bg: '#EEEBF7' },
  Nature: { fg: '#3F6B22', bg: '#EAF2E2' },
  Shop: { fg: '#8A5A0B', bg: '#F7EEDC' }
}

export interface Trip {
  id: string
  name: string
  startDate: string // YYYY-MM-DD
  endDate: string
}

export interface Item {
  id: string
  tripId: string
  title: string
  url: string | null
  note: string | null
  type: ItemType
  tags: string[]
  /** YYYY-MM-DD; null means it is still an unplanned idea. */
  day: string | null
  /** HH:MM */
  time: string | null
  booked: boolean
  bookingRef: string | null
  place: string | null
  lat: number | null
  lng: number | null
  sort: number
  createdAt: string
}

export type Status = 'idea' | 'planned' | 'booked'

export function statusOf(item: Item): Status {
  if (item.booked) return 'booked'
  return item.day ? 'planned' : 'idea'
}

export interface Filters {
  search: string
  types: ItemType[]
  tags: string[]
  statuses: Status[]
  matchAllTags: boolean
}

export const EMPTY_FILTERS: Filters = { search: '', types: [], tags: [], statuses: [], matchAllTags: false }

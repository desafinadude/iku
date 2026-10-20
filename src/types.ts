/** Colours and icons for common tags; used for new trips and for trips made before types became tags. */
export const DEFAULT_TAG_STYLES: { name: string; color: string; icon: string }[] = [
  { name: 'Food', color: '#B4461F', icon: 'restaurant' },
  { name: 'Sight', color: '#0E6B60', icon: 'photo_camera' },
  { name: 'Stay', color: '#3A5BA0', icon: 'hotel' },
  { name: 'Transport', color: '#5F4FA0', icon: 'train' },
  { name: 'Nature', color: '#3F6B22', icon: 'landscape' },
  { name: 'Shop', color: '#8A5A0B', icon: 'shopping_bag' }
]

/** Colours offered for tags. Each keeps white icons and text readable. */
export const LABEL_COLORS = ['#B4461F', '#C2410C', '#8A5A0B', '#3F6B22', '#0E6B60', '#0F6E8C', '#3A5BA0', '#5F4FA0', '#A23B72', '#B42318', '#4A5550', '#17201D']

/** Style for a tag, stored per trip. ('type' rows are from before types became tags.) */
export interface Label {
  id: string
  tripId: string
  kind: 'type' | 'tag'
  name: string
  color: string | null
  icon: string | null
  sort: number
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
  /** Preview image from the link (og:image), or null. */
  imageUrl: string | null
  note: string | null
  tags: string[]
  /** YYYY-MM-DD; null means it is still an unplanned idea. */
  day: string | null
  /** Last day for multi-day entries (inclusive; check-out day for a stay), else null. */
  endDay: string | null
  /** HH:MM */
  time: string | null
  /** HH:MM, optional; how long the entry runs in the hour-by-hour view. */
  endTime: string | null
  booked: boolean
  bookingRef: string | null
  place: string | null
  /** Google place id when the place was picked from Google search. */
  placeId: string | null
  lat: number | null
  lng: number | null
  sort: number
  createdAt: string
  /** Email of the member who added it (stamped by the database). */
  createdBy: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export interface Member {
  email: string
  name: string | null
  /** Small square image as a data URL, or null for initials. */
  avatar: string | null
  color: string | null
}

export const MEMBER_COLORS = ['#0E6B60', '#3A5BA0', '#B4461F', '#5F4FA0', '#3F6B22', '#8A5A0B', '#A23B72', '#17201D']

export type Status = 'idea' | 'planned' | 'booked'

export function statusOf(item: Item): Status {
  if (item.booked) return 'booked'
  return item.day ? 'planned' : 'idea'
}

export interface Filters {
  search: string
  tags: string[]
  statuses: Status[]
  /** Emails of the members who added the items. */
  people: string[]
  matchAllTags: boolean
}

export const EMPTY_FILTERS: Filters = { search: '', tags: [], statuses: [], people: [], matchAllTags: false }

export interface Attachment {
  id: string
  tripId: string
  /** null = a trip-wide document. */
  itemId: string | null
  path: string
  name: string
  mime: string | null
  size: number | null
  createdBy: string | null
  createdAt: string
}

/** A day's title, tag and colour (e.g. the city you're in). */
export interface DayInfo {
  day: string
  title: string | null
  /** One tag for the whole day; its colour is used unless color is set. */
  tag: string | null
  color: string | null
}

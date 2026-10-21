import { cleanTags } from '../lib'
import type { DayInfo, Item, Member, Trip } from '../types'

export const LOCAL_ME = 'you@local'

export const SEED_MEMBERS: Member[] = [
  { email: LOCAL_ME, name: null, avatar: null, color: '#0E6B60' },
  { email: 'sam@local', name: 'Sam', avatar: null, color: '#B4461F' }
]

export const SEED_TRIP: Trip = { id: 'local-trip', name: 'Japan, spring', startDate: '2027-04-12', endDate: '2027-04-20' }

let n = 0
/** A sample entry; its first tag (e.g. 'Food') gives it its colour and icon. */
function item(kind: string, title: string, o: Partial<Item> = {}): Item {
  n += 1
  const entry: Item = {
    id: `seed-${n}`,
    tripId: SEED_TRIP.id,
    title,
    url: null,
    imageUrl: null,
    note: null,
    tags: [],
    day: null,
    endDay: null,
    time: null,
    endTime: null,
    part: null,
    booked: false,
    pinned: false,
    chapter: false,
    bookingRef: null,
    place: null,
    placeId: null,
    lat: null,
    lng: null,
    sort: n,
    createdAt: new Date(2026, 9, 1, 0, n).toISOString(),
    createdBy: n % 3 === 0 ? 'sam@local' : LOCAL_ME,
    updatedBy: null,
    updatedAt: null,
    ...o
  }
  return { ...entry, tags: cleanTags([kind, ...(o.tags ?? [])]) }
}

export const SEED_ITEMS: Item[] = [
  item('Sight', 'Fushimi Inari at dawn', { url: 'https://www.youtube.com/', tags: ['Must do', 'Early'], place: 'Fushimi, Kyoto', lat: 34.9671, lng: 135.7727 }),
  item('Food', 'Kaiseki dinner in Gion', { url: 'https://tabelog.com/', note: 'Book 30 days ahead', tags: ['Splurge'], place: 'Gion, Kyoto', lat: 35.0037, lng: 135.7788 }),
  item('Food', 'Ask Kenji for his ramen spot in Shinjuku', { tags: ['Friends'] }),
  item('Sight', 'teamLab Borderless', { url: 'https://www.teamlab.art/', tags: ['Rainy day', 'Must do'], place: 'Azabudai Hills, Tokyo', lat: 35.6604, lng: 139.7404 }),
  item('Nature', 'Nakasendo walk, Magome to Tsumago', { url: 'https://www.japan-guide.com/', tags: ['Day trip'], lat: 35.5276, lng: 137.5663 }),
  item('Transport', 'Land at Haneda', { day: '2027-04-12', time: '15:40', booked: true, bookingRef: '[REF]', lat: 35.5494, lng: 139.7798, place: 'Haneda Airport' }),
  item('Stay', 'Shinjuku hotel', { day: '2027-04-12', endDay: '2027-04-14', time: '15:00', booked: true, pinned: true, bookingRef: '[REF]', lat: 35.6938, lng: 139.7034 }),
  item('Food', 'Omoide Yokocho', { day: '2027-04-12', time: '19:30', tags: ['First night'], lat: 35.6933, lng: 139.6995 }),
  item('Food', 'Tsukiji outer market', { day: '2027-04-13', time: '08:00', lat: 35.6655, lng: 139.7707 }),
  item('Sight', 'Senso-ji & Nakamise', { day: '2027-04-13', time: '10:30', tags: ['Must do', 'Temples'], place: 'Asakusa', lat: 35.7148, lng: 139.7967 }),
  item('Sight', 'Yanaka old-town walk', { day: '2027-04-13', time: '14:00', tags: ['Slow'], lat: 35.7266, lng: 139.7676 }),
  item('Sight', 'Shibuya Sky at sunset', { day: '2027-04-13', time: '19:00', booked: true, bookingRef: '[REF]', note: '2 tickets', lat: 35.6585, lng: 139.7023 }),
  item('Transport', 'Shinkansen to Kyoto', { day: '2027-04-14', time: '09:12', booked: true, bookingRef: '[REF]', lat: 35.6812, lng: 139.7671, place: 'Tokyo Station' }),
  item('Stay', 'Higashiyama ryokan', { day: '2027-04-14', endDay: '2027-04-17', time: '15:00', booked: true, pinned: true, bookingRef: '[REF]', lat: 34.9986, lng: 135.7813 }),
  item('Sight', 'Evening walk through Gion', { day: '2027-04-14', time: '17:00', lat: 35.0037, lng: 135.7756 })
]

/** Sample day titles: Tokyo first, then Kyoto. */
export const SEED_DAYS: DayInfo[] = [
  ...['2027-04-12', '2027-04-13'].map((day) => ({ day, title: 'Tokyo', tag: 'Tokyo', color: '#C2410C' })),
  { day: '2027-04-14', title: 'Tokyo → Kyoto', tag: 'Kyoto', color: null },
  ...['2027-04-15', '2027-04-16', '2027-04-17'].map((day) => ({ day, title: 'Kyoto', tag: 'Kyoto', color: '#0F6E8C' }))
]

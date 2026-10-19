import type { Item, ItemType, Trip } from '../types'

export const SEED_TRIP: Trip = { id: 'local-trip', name: 'Japan, spring', startDate: '2027-04-12', endDate: '2027-04-20' }

let n = 0
function item(type: ItemType, title: string, o: Partial<Item> = {}): Item {
  n += 1
  return {
    id: `seed-${n}`,
    tripId: SEED_TRIP.id,
    title,
    type,
    url: null,
    note: null,
    tags: [],
    day: null,
    time: null,
    booked: false,
    bookingRef: null,
    place: null,
    lat: null,
    lng: null,
    sort: n,
    createdAt: new Date(2026, 9, 1, 0, n).toISOString(),
    ...o
  }
}

export const SEED_ITEMS: Item[] = [
  item('Sight', 'Fushimi Inari at dawn', { url: 'https://www.youtube.com/', tags: ['#must-do', '#early'], place: 'Fushimi, Kyoto', lat: 34.9671, lng: 135.7727 }),
  item('Food', 'Kaiseki dinner in Gion', { url: 'https://tabelog.com/', note: 'Book 30 days ahead', tags: ['#splurge'], place: 'Gion, Kyoto', lat: 35.0037, lng: 135.7788 }),
  item('Food', 'Ask Kenji for his ramen spot in Shinjuku', { tags: ['#friends'] }),
  item('Sight', 'teamLab Borderless', { url: 'https://www.teamlab.art/', tags: ['#rainy-day', '#must-do'], place: 'Azabudai Hills, Tokyo', lat: 35.6604, lng: 139.7404 }),
  item('Nature', 'Nakasendo walk, Magome to Tsumago', { url: 'https://www.japan-guide.com/', tags: ['#day-trip'], lat: 35.5276, lng: 137.5663 }),
  item('Transport', 'Land at Haneda', { day: '2027-04-12', time: '15:40', booked: true, bookingRef: '[REF]', lat: 35.5494, lng: 139.7798, place: 'Haneda Airport' }),
  item('Stay', 'Check in, Shinjuku hotel', { day: '2027-04-12', time: '17:30', booked: true, bookingRef: '[REF]', note: '4 nights', lat: 35.6938, lng: 139.7034 }),
  item('Food', 'Omoide Yokocho', { day: '2027-04-12', time: '19:30', tags: ['#first-night'], lat: 35.6933, lng: 139.6995 }),
  item('Food', 'Tsukiji outer market', { day: '2027-04-13', time: '08:00', lat: 35.6655, lng: 139.7707 }),
  item('Sight', 'Senso-ji & Nakamise', { day: '2027-04-13', time: '10:30', tags: ['#must-do', '#temples'], place: 'Asakusa', lat: 35.7148, lng: 139.7967 }),
  item('Sight', 'Yanaka old-town walk', { day: '2027-04-13', time: '14:00', tags: ['#slow'], lat: 35.7266, lng: 139.7676 }),
  item('Sight', 'Shibuya Sky at sunset', { day: '2027-04-13', time: '19:00', booked: true, bookingRef: '[REF]', note: '2 tickets', lat: 35.6585, lng: 139.7023 }),
  item('Transport', 'Shinkansen to Kyoto', { day: '2027-04-14', time: '09:12', booked: true, bookingRef: '[REF]', lat: 35.6812, lng: 139.7671, place: 'Tokyo Station' }),
  item('Stay', 'Check in, Higashiyama ryokan', { day: '2027-04-14', time: '13:00', booked: true, bookingRef: '[REF]', note: '3 nights', lat: 34.9986, lng: 135.7813 }),
  item('Sight', 'Evening walk through Gion', { day: '2027-04-14', time: '17:00', lat: 35.0037, lng: 135.7756 })
]

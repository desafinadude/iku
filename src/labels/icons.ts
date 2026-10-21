import { lucideNode, lucideSvg } from './lucide'

// Tag icons use Lucide (lucide.dev). These are offered first in the picker; any Lucide name works.
export const SUGGESTED_ICONS = [
  'utensils', 'coffee', 'croissant', 'soup', 'pizza', 'ice-cream-cone', 'cake-slice', 'wine', 'beer', 'martini',
  'bed-double', 'hotel', 'house', 'tent', 'luggage', 'backpack',
  'plane', 'train-front', 'train-front-tunnel', 'tram-front', 'bus', 'car', 'car-taxi-front', 'ship', 'sailboat', 'bike', 'footprints',
  'map', 'map-pin', 'compass', 'camera', 'landmark', 'castle', 'church', 'drama', 'ferris-wheel', 'palette', 'music', 'ticket',
  'mountain', 'mountain-snow', 'trees', 'tree-pine', 'tree-palm', 'flower-2', 'waves', 'umbrella', 'sun', 'moon', 'cloud-rain', 'snowflake', 'bath',
  'shopping-bag', 'store', 'gift', 'gem', 'gamepad-2', 'baby', 'paw-print', 'users', 'smile',
  'star', 'heart', 'sparkles', 'bookmark', 'flag', 'info', 'circle-alert', 'clock', 'banknote', 'credit-card', 'hospital', 'wifi'
]

/** Material Symbols names (the previous icon set) and the first set's names, mapped to Lucide. */
const TO_LUCIDE: Record<string, string> = {
  restaurant: 'utensils', local_cafe: 'coffee', local_bar: 'martini', bakery_dining: 'croissant', ramen_dining: 'soup', icecream: 'ice-cream-cone',
  wine_bar: 'wine', nightlife: 'party-popper', hotel: 'bed-double', bed: 'bed', cottage: 'house', house: 'house', camping: 'tent',
  flight: 'plane', train: 'train-front', subway: 'train-front-tunnel', directions_bus: 'bus', directions_car: 'car', local_taxi: 'car-taxi-front',
  directions_boat: 'ship', directions_walk: 'footprints', pedal_bike: 'bike', hiking: 'backpack', luggage: 'luggage', photo_camera: 'camera',
  account_balance: 'landmark', museum: 'landmark', temple_buddhist: 'landmark', temple_hindu: 'landmark', castle: 'castle', church: 'church',
  mosque: 'landmark', stadium: 'trophy', theater_comedy: 'drama', attractions: 'ferris-wheel', palette: 'palette', landscape: 'mountain',
  park: 'trees', forest: 'tree-pine', beach_access: 'umbrella', pool: 'waves', water: 'droplets', spa: 'flower-2', hot_tub: 'bath',
  sunny: 'sun', nights_stay: 'moon', rainy: 'cloud-rain', shopping_bag: 'shopping-bag', storefront: 'store', local_mall: 'shopping-cart',
  redeem: 'gift', confirmation_number: 'ticket', music_note: 'music', sports_esports: 'gamepad-2', child_care: 'baby', pets: 'paw-print',
  star: 'star', favorite: 'heart', bookmark: 'bookmark', flag: 'flag', priority_high: 'circle-alert', schedule: 'clock', info: 'info',
  payments: 'banknote', local_hospital: 'hospital', wifi: 'wifi', location_on: 'map-pin', face: 'smile',
  pin: 'map-pin', food: 'utensils', coffee: 'coffee', drink: 'martini', plane: 'plane', bus: 'bus', car: 'car', boat: 'ship', walk: 'footprints',
  bike: 'bike', camera: 'camera', landmark: 'landmark', torii: 'landmark', mountain: 'mountain', beach: 'umbrella', tree: 'trees', shop: 'shopping-bag',
  ticket: 'ticket', music: 'music', heart: 'heart', sun: 'sun', rain: 'cloud-rain', moon: 'moon', kids: 'baby', money: 'banknote'
}

/** The Lucide name to draw for a stored icon name (old Material names are translated). */
export function lucideName(name: string | null | undefined): string {
  if (!name) return 'map-pin'
  return TO_LUCIDE[name] ?? name
}

/** Fallback for names Lucide doesn't have: names from the first icon set, mapped to Material Symbols. */
const LEGACY: Record<string, string> = {
  pin: 'location_on', food: 'restaurant', coffee: 'local_cafe', drink: 'local_bar', bed: 'hotel', plane: 'flight',
  train: 'train', bus: 'directions_bus', car: 'directions_car', boat: 'directions_boat', walk: 'directions_walk',
  bike: 'pedal_bike', camera: 'photo_camera', landmark: 'account_balance', torii: 'temple_buddhist', museum: 'museum',
  mountain: 'landscape', beach: 'beach_access', tree: 'park', shop: 'shopping_bag', ticket: 'confirmation_number',
  music: 'music_note', star: 'star', heart: 'favorite', sun: 'sunny', rain: 'rainy', moon: 'nights_stay', spa: 'spa',
  kids: 'child_care', info: 'info', flag: 'flag', money: 'payments'
}

/** A safe Material Symbols ligature name (letters, digits, underscores), legacy names translated. */
export function iconName(name: string | null | undefined): string {
  if (!name) return 'location_on'
  const n = LEGACY[name] ?? name
  return /^[a-z0-9_]+$/.test(n) ? n : 'location_on'
}

/** Icon markup for places that need an HTML string (Leaflet map pins). */
export function iconHtml(name: string | null | undefined, size: number, color: string) {
  const node = lucideNode(lucideName(name))
  if (node) return lucideSvg(node, size, color)
  return `<span class="msr filled" style="font-size:${size}px;color:${color}" aria-hidden="true">${iconName(name)}</span>`
}

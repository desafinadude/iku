// Type and tag icons use Google's Material Symbols (Rounded) font: fonts.google.com/icons.
// Any icon name from that site works; these are offered first in the picker.
export const SUGGESTED_ICONS = [
  'restaurant', 'local_cafe', 'local_bar', 'bakery_dining', 'ramen_dining', 'icecream', 'wine_bar', 'nightlife',
  'hotel', 'bed', 'cottage', 'house', 'camping',
  'flight', 'train', 'subway', 'directions_bus', 'directions_car', 'local_taxi', 'directions_boat', 'directions_walk', 'pedal_bike', 'hiking', 'luggage',
  'photo_camera', 'account_balance', 'museum', 'temple_buddhist', 'temple_hindu', 'castle', 'church', 'mosque', 'stadium', 'theater_comedy', 'attractions', 'palette',
  'landscape', 'park', 'forest', 'beach_access', 'pool', 'water', 'spa', 'hot_tub', 'sunny', 'nights_stay', 'rainy',
  'shopping_bag', 'storefront', 'local_mall', 'redeem',
  'confirmation_number', 'music_note', 'sports_esports', 'child_care', 'pets',
  'star', 'favorite', 'bookmark', 'flag', 'priority_high', 'schedule', 'info', 'payments', 'local_hospital', 'wifi', 'location_on'
]

/** Names from the first icon set, mapped to Material Symbols so saved styles keep working. */
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
  return `<span class="msr filled" style="font-size:${size}px;color:${color}" aria-hidden="true">${iconName(name)}</span>`
}

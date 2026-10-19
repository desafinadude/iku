// Line icons for types and tags (24×24 grid, drawn with a 2px stroke). Small enough
// to sit inside a map pin as well as on chips and cards.
export const LABEL_ICONS = {
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  food: 'M7 3v8 M4.5 3v5a2.5 2.5 0 0 0 5 0V3 M7 11v10 M17 3c-2 1.5-3 4-3 7h3v11 M17 3v18',
  coffee: 'M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 11h1.5a2.5 2.5 0 0 1 0 5H17 M8 3v3 M12 3v3',
  drink: 'M5 4h14l-7 8z M12 12v8 M8 20h8',
  bed: 'M3 19V6 M3 15h18v4 M21 15v-3a3 3 0 0 0-3-3h-7v6 M7 12a2 2 0 1 0 0-.01',
  plane: 'M10.5 13.5L4 11l1.5-1.5 7 1 3.5-3.5a2 2 0 0 1 3 3L15.5 13.5l1 7L15 22l-2.5-6.5L9 19v2.5L7.5 22 6 18l-4-1.5L3.5 15H6z',
  train: 'M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2z M5 10h14 M9 14h.01 M15 14h.01 M8 21l2-4 M16 21l-2-4',
  bus: 'M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2z M4 11h16 M7 17v3 M17 17v3 M8 14h.01 M16 14h.01',
  car: 'M5 16h14v-4l-2-5H7l-2 5z M3 12h18 M7 16v2 M17 16v2 M8 13.5h.01 M16 13.5h.01',
  boat: 'M3 16l2 4h14l2-4z M12 4v12 M12 4l6 9H12',
  walk: 'M13 4a1.5 1.5 0 1 0 0 .01 M10 21l2-6 3 3v3 M8 12l3-4 3 2 3 1 M11 8l-1 5',
  bike: 'M6 17a3 3 0 1 0 0-.01 M18 17a3 3 0 1 0 0-.01 M6 17l4-7h5l3 7 M10 10L8 6H6 M14 6h2',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  landmark: 'M3 21h18 M5 21V10 M19 21V10 M9 21v-11 M15 21v-11 M3 10l9-6 9 6z',
  torii: 'M3 6c4 1 14 1 18 0 M4 9h16 M7 6v15 M17 6v15 M12 6v3',
  museum: 'M4 21h16 M6 18V9 M10 18V9 M14 18V9 M18 18V9 M3 9l9-5 9 5z',
  mountain: 'M3 20l6-11 4 6 2-3 6 8z M8 11l1.5 1.5L11 11',
  beach: 'M4 20h16 M12 20l-3-12 M5 8c2-4 9-5 12-1z M15 15a2 2 0 1 0 0-.01',
  tree: 'M12 3l6 9h-3l4 6H5l4-6H6z M12 18v3',
  shop: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  ticket: 'M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z M13 4v12',
  music: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  rain: 'M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 15z M8 18l-1 3 M12 18l-1 3 M16 18l-1 3',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  spa: 'M12 21c-5 0-8-3-8-7 3 0 6 1 8 4 2-3 5-4 8-4 0 4-3 7-8 7z M12 18c-2-3-2-7 0-11 2 4 2 8 0 11z',
  kids: 'M12 7a2.5 2.5 0 1 0 0-.01 M8 21l2-7h4l2 7 M7 11l5 1 5-1',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8h.01',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  money: 'M3 7h18v10H3z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M6 10v.01 M18 14v.01'
} as const

export type LabelIcon = keyof typeof LABEL_ICONS
export const LABEL_ICON_NAMES = Object.keys(LABEL_ICONS) as LabelIcon[]

export function isLabelIcon(name: string | null | undefined): name is LabelIcon {
  return !!name && name in LABEL_ICONS
}

/** SVG markup for an icon, for places that need an HTML string (map pins). */
export function iconSvg(name: string | null | undefined, size: number, color: string) {
  const d = LABEL_ICONS[isLabelIcon(name) ? name : 'pin']
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`
}

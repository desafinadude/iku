import { LABEL_COLORS } from './types'

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
/** Mixes a colour towards white (amount > 0) or black (amount < 0). */
const shade = (hex: string, amount: number) => toHex(rgb(hex).map((v) => (amount > 0 ? v + (255 - v) * amount : v * (1 + amount))))

// The picker's palette, one row per group: 16 hues around the wheel in pastel, light, bright and deep,
// the original muted colours, and neutrals.
const HUES: [string, string, string, string][] = [
  ['#FECACA', '#F87171', '#DC2626', '#991B1B'], // red
  ['#FED7AA', '#FB923C', '#EA580C', '#9A3412'], // orange
  ['#FDE68A', '#FBBF24', '#D97706', '#92400E'], // amber
  ['#FEF08A', '#FACC15', '#CA8A04', '#854D0E'], // yellow
  ['#D9F99D', '#A3E635', '#65A30D', '#3F6212'], // lime
  ['#BBF7D0', '#4ADE80', '#16A34A', '#166534'], // green
  ['#A7F3D0', '#34D399', '#059669', '#065F46'], // emerald
  ['#99F6E4', '#2DD4BF', '#0D9488', '#115E59'], // teal
  ['#A5F3FC', '#22D3EE', '#0891B2', '#155E75'], // cyan
  ['#BAE6FD', '#38BDF8', '#0284C7', '#075985'], // sky
  ['#BFDBFE', '#60A5FA', '#2563EB', '#1E40AF'], // blue
  ['#C7D2FE', '#818CF8', '#4F46E5', '#3730A3'], // indigo
  ['#DDD6FE', '#A78BFA', '#7C3AED', '#5B21B6'], // violet
  ['#F5D0FE', '#E879F9', '#C026D3', '#86198F'], // fuchsia
  ['#FBCFE8', '#F472B6', '#DB2777', '#9D174D'], // pink
  ['#E2E8F0', '#94A3B8', '#475569', '#1E293B'] // slate
]
export const PALETTE: { name: string; colors: string[] }[] = [
  ...['Pastel', 'Light', 'Bright', 'Deep'].map((name, i) => ({ name, colors: HUES.map((h) => h[i]) })),
  { name: 'Muted', colors: LABEL_COLORS },
  { name: 'Neutrals', colors: ['#FFFFFF', '#F4F5F1', '#E7E5E4', '#D6D3D1', '#A8A29E', '#78716C', '#44403C', '#17201D'] }
]

/** A colour value is "#RRGGBB", or "#RRGGBB>#RRGGBB" for a top-to-bottom gradient. */
export const colorStops = (v: string | null | undefined): string[] => (v ? v.split('>').filter(Boolean) : [])
export const firstColor = (v: string | null | undefined) => colorStops(v)[0] ?? null
/** CSS background for a colour value (a gradient when it has two stops). */
export function colorCss(v: string | null | undefined, direction = 'to bottom') {
  const [a, b] = colorStops(v)
  if (!a) return undefined
  return b ? `linear-gradient(${direction}, ${a}, ${b})` : a
}

const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const INK = '#17201D'

/** True for pale colours that work as a background as they are. */
export const isLight = (hex: string) => luminance(hex) > 0.55

/** Text colour to put on a solid background of this colour: white on dark colours, ink on pale ones. */
export function onColor(hex: string | null | undefined) {
  if (!hex) return '#fff'
  return contrast(hex, '#FFFFFF') >= contrast(hex, INK) ? '#fff' : INK
}

/** A version of the colour that stays readable as text or an icon on a light background (pastels get darker). */
export function inkColor(hex: string | null | undefined) {
  if (!hex) return undefined
  let c = hex
  for (let i = 0; i < 8 && contrast(c, '#F4F5F1') < 3.2; i++) c = shade(c, -0.18)
  return c
}

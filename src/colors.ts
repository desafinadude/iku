
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
/** Mixes a colour towards white (amount > 0) or black (amount < 0). */
const shade = (hex: string, amount: number) => toHex(rgb(hex).map((v) => (amount > 0 ? v + (255 - v) * amount : v * (1 + amount))))

// The picker's palette: 8 hues in pastel, mid and deep, plus neutrals. Short on purpose.
export const PALETTE: string[][] = [
  ['#FECACA', '#FED7AA', '#FEF08A', '#BBF7D0', '#99F6E4', '#BFDBFE', '#DDD6FE', '#FBCFE8'],
  ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'],
  ['#991B1B', '#9A3412', '#854D0E', '#166534', '#115E59', '#1E40AF', '#5B21B6', '#9D174D'],
  ['#FFFFFF', '#F4F5F1', '#D6D3D1', '#A8A29E', '#78716C', '#475569', '#1E293B', '#17201D']
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

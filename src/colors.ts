import { LABEL_COLORS } from './types'

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
/** Mixes a colour towards white (amount > 0) or black (amount < 0). */
const shade = (hex: string, amount: number) => toHex(rgb(hex).map((v) => (amount > 0 ? v + (255 - v) * amount : v * (1 + amount))))

/** Swatch rows from pastel to deep; the third row is the original palette. */
export const COLOR_ROWS: string[][] = [0.78, 0.5, 0, -0.35].map((amount) => LABEL_COLORS.map((c) => (amount ? shade(c, amount) : c)))

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

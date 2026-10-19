import { iconName } from './icons'

/** A Material Symbols icon (colour comes from the surrounding text colour). */
export function LabelIconView({ name, size = 16, filled = true }: { name: string | null | undefined; size?: number; filled?: boolean }) {
  return (
    <span className={`msr${filled ? ' filled' : ''}`} style={{ fontSize: size }} aria-hidden="true">
      {iconName(name)}
    </span>
  )
}

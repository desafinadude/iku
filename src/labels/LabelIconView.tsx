import { isLabelIcon, LABEL_ICONS } from './icons'

/** Draws one of the label icons inline (stroke uses currentColor). */
export function LabelIconView({ name, size = 16 }: { name: string | null | undefined; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={LABEL_ICONS[isLabelIcon(name) ? name : 'pin']} />
    </svg>
  )
}

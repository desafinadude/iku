import { useEffect, useRef, useState } from 'react'
import type { CardLook } from '../usePrefs'
import { Icon, type IconName } from './Icon'

const LOOKS: { value: CardLook; label: string; icon: IconName }[] = [
  { value: 'full', label: 'Full cards', icon: 'cardsFull' },
  { value: 'titles', label: 'Titles only', icon: 'titles' },
  { value: 'pictures', label: 'Pictures only', icon: 'image' }
]

/** One tap cycles full cards → titles only → pictures only. */
export function CardLookButton({ look, onChange }: { look: CardLook; onChange: (look: CardLook) => void }) {
  const i = LOOKS.findIndex((l) => l.value === look)
  const next = LOOKS[(i + 1) % LOOKS.length]
  return (
    <button className="icon-btn head-btn" aria-label={`Cards: ${LOOKS[i].label}. Switch to ${next.label.toLowerCase()}`} title={`${LOOKS[i].label} (tap for ${next.label.toLowerCase()})`} onClick={() => onChange(next.value)}>
      <Icon name={LOOKS[i].icon} size={16} />
    </button>
  )
}

/** The ⋯ menu: how to sort the cards and how much each card shows. */
export function CardMenu<T extends string>({
  label,
  order,
  orders,
  onOrder,
  look,
  onLook,
  hint
}: {
  label: string
  order: T
  orders: { value: T; label: string }[]
  onOrder: (order: T) => void
  look: CardLook
  onLook: (look: CardLook) => void
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const pick = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn head-btn" aria-label={`${label} options`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name="more" size={16} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label={`${label} options`}>
          <p className="menu-head">Sort</p>
          {orders.map((o) => (
            <button key={o.value} role="menuitemradio" aria-checked={order === o.value} className="menu-item" onClick={pick(() => onOrder(o.value))}>
              <span className="menu-check">{order === o.value && <Icon name="check" size={14} strokeWidth={2.4} />}</span>
              {o.label}
            </button>
          ))}
          {hint && <p className="menu-hint">{hint}</p>}
          <p className="menu-head">Cards</p>
          {LOOKS.map((l) => (
            <button key={l.value} role="menuitemradio" aria-checked={look === l.value} className="menu-item" onClick={pick(() => onLook(l.value))}>
              <span className="menu-check">{look === l.value && <Icon name="check" size={14} strokeWidth={2.4} />}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const DAY_ORDERS = [
  { value: 'time' as const, label: 'By time, no time last' },
  { value: 'custom' as const, label: 'Custom (drag to arrange)' },
  { value: 'title' as const, label: 'By title, A–Z' }
]

export const IDEA_ORDERS = [
  { value: 'newest' as const, label: 'Newest first' },
  { value: 'oldest' as const, label: 'Oldest first' },
  { value: 'custom' as const, label: 'Custom (drag to arrange)' },
  { value: 'title' as const, label: 'By title, A–Z' },
  { value: 'tag' as const, label: 'By tag' }
]

export const DRAG_HINT = 'Dragging a card onto another card switches to Custom.'

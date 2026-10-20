import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SHOW_ALL, type CardShow } from '../usePrefs'
import { Icon, type IconName } from './Icon'

/** A header button that opens a small menu below it; closes on outside click or Esc. */
function MenuButton({ label, icon, children }: { label: string; icon: IconName; children: (close: () => void) => ReactNode }) {
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
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn head-btn" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name={icon} size={16} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

const PARTS: { key: keyof CardShow; label: string }[] = [
  { key: 'tagIcons', label: 'Tag icons along the top' },
  { key: 'image', label: 'Picture' },
  { key: 'title', label: 'Title' },
  { key: 'details', label: 'Details (time, notes, link, booking)' },
  { key: 'tags', label: 'Tags along the bottom' }
]

const PRESETS: { label: string; show: CardShow }[] = [
  { label: 'Everything', show: SHOW_ALL },
  { label: 'Titles', show: { image: false, title: true, details: false, tags: false, tagIcons: false } },
  { label: 'Pictures', show: { image: true, title: false, details: false, tags: false, tagIcons: false } },
  { label: 'Icons + titles', show: { image: false, title: true, details: false, tags: false, tagIcons: true } }
]

/** Which parts the cards show: tick any combination, or pick a preset. */
export function CardShowMenu({ label, show, onChange }: { label: string; show: CardShow; onChange: (show: CardShow) => void }) {
  const same = (a: CardShow, b: CardShow) => PARTS.every((p) => a[p.key] === b[p.key])
  return (
    <MenuButton label={`${label}: what cards show`} icon="cardsFull">
      {() => (
        <>
          <p className="menu-head">Cards show</p>
          {PARTS.map((p) => (
            <label key={p.key} className="menu-item menu-check-item">
              <input
                type="checkbox"
                checked={show[p.key]}
                // At least one part always stays on.
                disabled={show[p.key] && PARTS.filter((q) => show[q.key]).length === 1}
                onChange={(e) => onChange({ ...show, [p.key]: e.target.checked })}
              />
              {p.label}
            </label>
          ))}
          <div className="menu-presets">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className={`chip chip-small${same(show, p.show) ? ' is-on' : ''}`} aria-pressed={same(show, p.show)} onClick={() => onChange(p.show)}>
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </MenuButton>
  )
}

/** The ⋯ menu: how to sort the cards. */
export function SortMenu<T extends string>({ label, order, orders, onOrder, hint }: { label: string; order: T; orders: { value: T; label: string }[]; onOrder: (order: T) => void; hint?: string }) {
  return (
    <MenuButton label={`${label}: sort`} icon="more">
      {(close) => (
        <>
          <p className="menu-head">Sort</p>
          {orders.map((o) => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={order === o.value}
              className="menu-item"
              onClick={() => {
                onOrder(o.value)
                close()
              }}
            >
              <span className="menu-check">{order === o.value && <Icon name="check" size={14} strokeWidth={2.4} />}</span>
              {o.label}
            </button>
          ))}
          {hint && <p className="menu-hint">{hint}</p>}
        </>
      )}
    </MenuButton>
  )
}

const ZOOMS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75]

/** − 100% + : makes the idea tiles smaller or bigger. Tap the percentage to reset. */
export function ZoomControl({ zoom, onChange }: { zoom: number; onChange: (zoom: number) => void }) {
  const i = Math.max(0, ZOOMS.findIndex((z) => z >= zoom - 0.001))
  return (
    <div className="zoom-control" role="group" aria-label="Tile size">
      <button type="button" aria-label="Smaller tiles" disabled={i === 0} onClick={() => onChange(ZOOMS[i - 1])}>
        −
      </button>
      <button type="button" className="zoom-value" aria-label="Normal size" title="Normal size" onClick={() => onChange(1)}>
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" aria-label="Bigger tiles" disabled={i === ZOOMS.length - 1} onClick={() => onChange(ZOOMS[i + 1])}>
        +
      </button>
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

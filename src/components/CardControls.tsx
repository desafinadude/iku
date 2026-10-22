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
export function CardShowMenu({ label, show, onChange, layout, onLayout }: { label: string; show: CardShow; onChange: (show: CardShow) => void; layout?: 'grid' | 'list'; onLayout?: (layout: 'grid' | 'list') => void }) {
  const same = (a: CardShow, b: CardShow) => PARTS.every((p) => a[p.key] === b[p.key])
  return (
    <MenuButton label={`${label}: what cards show`} icon="cardsFull">
      {() => (
        <>
          {layout && onLayout && (
            <>
              <p className="menu-head">Layout</p>
              <div className="seg seg-small menu-layout" role="group" aria-label="Layout">
                {(
                  [
                    ['grid', 'Tiles'],
                    ['list', 'List']
                  ] as const
                ).map(([v, text]) => (
                  <button key={v} type="button" className={layout === v ? 'is-on' : ''} aria-pressed={layout === v} onClick={() => onLayout(v)}>
                    <Icon name={v} size={15} /> {text}
                  </button>
                ))}
              </div>
            </>
          )}
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

/** − 2 cols + : how many columns of ideas, from 1 to 5. */
export function ColumnsControl({ cols, onChange }: { cols: number; onChange: (cols: number) => void }) {
  return (
    <div className="zoom-control" role="group" aria-label={`Columns: ${cols}`}>
      <button type="button" aria-label="Fewer columns" disabled={cols <= 1} onClick={() => onChange(cols - 1)}>
        −
      </button>
      <span className="zoom-value" aria-hidden="true">
        {cols} col
      </span>
      <button type="button" aria-label="More columns" disabled={cols >= 5} onClick={() => onChange(cols + 1)}>
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

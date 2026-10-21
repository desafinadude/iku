import { useEffect, useRef, useState } from 'react'
import { DEFAULT_LABEL_ID } from '../data/normalize'
import { iconLetters, lucideName, SUGGESTED_ICONS } from '../labels/icons'
import { lucideNames, useLucide } from '../labels/lucide'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels, type TagStyle } from '../labels/LabelsContext'
import { normalizeTag, uid } from '../lib'
import { ColorField, ColorPalette } from './ColorField'
import { LABEL_COLORS, type Item, type Label } from '../types'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

interface Props {
  tripId: string
  items: Item[]
  onSave: (labels: Label[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (kind: Label['kind'], from: string, to: string) => Promise<void>
  onDeleteTag: (tag: string) => Promise<void>
  onClose: () => void
}

/** Which picker is open, and for which tag. */
type Open = { name: string; picker: 'color' | 'icon' } | null

/**
 * All tags as one editable list: drag to reorder, tap the swatch for a colour or the icon for an icon,
 * edit the name in place (renaming onto an existing tag merges them), and add new ones at the bottom.
 * Every change saves straight away.
 */
export function LabelsManager({ tripId, items, onSave, onRename, onDeleteTag, onClose }: Props) {
  const { tags } = useLabels()
  const [open, setOpen] = useState<Open>(null)
  const [newName, setNewName] = useState('')
  /** Tag names in their order while a row is being dragged. */
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())

  const usage = (name: string) => items.filter((x) => x.tags.includes(name)).length
  const find = (name: string) => tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
  const nextSort = () => Math.max(0, ...tags.map((t) => t.label?.sort ?? 0)) + 1
  // Built-in styles aren't stored yet; saving one stores it as the trip's own.
  const labelId = (t: TagStyle) => (t.label && !t.label.id.startsWith(DEFAULT_LABEL_ID) ? t.label.id : uid())

  const store = (t: TagStyle, patch: { color?: string | null; icon?: string | null; iconColor?: string | null }) =>
    onSave([{ id: labelId(t), tripId, kind: 'tag', name: t.name, color: patch.color !== undefined ? patch.color : t.color, icon: patch.icon !== undefined ? patch.icon : t.icon, iconColor: patch.iconColor !== undefined ? patch.iconColor : (t.label?.iconColor ?? null), sort: t.label?.sort ?? nextSort() }])

  const rename = async (t: TagStyle, raw: string) => {
    const name = normalizeTag(raw)
    if (!name || name === t.name) return
    const target = find(name)
    const merging = target && target.name !== t.name
    if (merging && !confirm(`“${target.name}” already exists. Merge “${t.name}” into it?`)) return
    await onRename('tag', t.name, merging ? target.name : name)
  }

  const remove = async (t: TagStyle) => {
    const n = usage(t.name)
    if (!confirm(n ? `Remove “${t.name}” from ${n} ${n === 1 ? 'entry' : 'entries'}?` : `Delete “${t.name}”?`)) return
    await onDeleteTag(t.name)
  }

  const add = async () => {
    const name = normalizeTag(newName)
    if (!name) return
    setNewName('')
    if (find(name)) return
    const color = LABEL_COLORS[(tags.length * 5) % LABEL_COLORS.length]
    // New tags go at the bottom of the list, so the list keeps the order it shows.
    await onSave([...orderRows(tags.map((t) => t.name)), { id: uid(), tripId, kind: 'tag', name, color, icon: null, sort: tags.length + 1 }])
    setOpen({ name, picker: 'icon' })
  }

  /** Saves the order shown: every tag gets a stored style row with its position. */
  const orderRows = (names: string[]): Label[] => {
    const byName = new Map(tags.map((t) => [t.name, t]))
    return names.map((n) => byName.get(n)!).map((t, i) => ({ id: labelId(t), tripId, kind: 'tag' as const, name: t.name, color: t.color, icon: t.icon, iconColor: t.label?.iconColor ?? null, sort: i + 1 }))
  }
  const saveOrder = (names: string[]) => onSave(orderRows(names))
  const move = (name: string, by: number) => {
    const names = tags.map((t) => t.name)
    const from = names.indexOf(name)
    const to = Math.min(Math.max(from + by, 0), names.length - 1)
    if (from === to) return
    names.splice(to, 0, names.splice(from, 1)[0])
    saveOrder(names)
  }

  // Dragging a row by its handle (mouse or touch). The row moves to wherever the pointer is. The pointer is
  // followed on the whole window: re-ordering moves the row in the page, which would drop pointer capture.
  const orderRef = useRef<string[] | null>(null)
  const startDrag = (name: string, e: React.PointerEvent) => {
    e.preventDefault()
    setOpen(null)
    orderRef.current = tags.map((t) => t.name)
    setDragOrder(orderRef.current)
    setDragging(name)
  }
  useEffect(() => {
    if (!dragging) return
    const scroller = rows.current.get(dragging)?.closest('.sheet-body') as HTMLElement | null
    const onMove = (e: PointerEvent) => {
      e.preventDefault()
      const order = orderRef.current
      if (!order) return
      // Near the top or bottom of the sheet, scroll it so long lists can be reordered.
      if (scroller) {
        const r = scroller.getBoundingClientRect()
        if (e.clientY < r.top + 48) scroller.scrollTop -= 12
        else if (e.clientY > r.bottom - 48) scroller.scrollTop += 12
      }
      const others = order.filter((n) => n !== dragging)
      let at = others.length
      for (let i = 0; i < others.length; i++) {
        const r = rows.current.get(others[i])?.getBoundingClientRect()
        if (r && e.clientY < r.top + r.height / 2) {
          at = i
          break
        }
      }
      const next = [...others.slice(0, at), dragging, ...others.slice(at)]
      if (next.join('\n') !== order.join('\n')) {
        orderRef.current = next
        setDragOrder(next)
      }
    }
    const onUp = () => {
      const order = orderRef.current
      if (order && order.join('\n') !== tags.map((t) => t.name).join('\n')) saveOrder(order)
      orderRef.current = null
      setDragging(null)
      setDragOrder(null)
    }
    document.body.classList.add('is-sorting')
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      document.body.classList.remove('is-sorting')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  const shown = dragOrder ? dragOrder.map((n) => tags.find((t) => t.name === n)!).filter(Boolean) : tags

  return (
    <Sheet title="Tags" onClose={onClose}>
      <p className="muted small" style={{ margin: 0 }}>
        Tap a swatch for a colour or an icon to change it; edit names in place. Drag ⋮⋮ to reorder. An entry’s first coloured tag colours its card and map pin. Renaming a tag to an existing one merges them.
      </p>
      <ul className="tag-table">
        {shown.map((t) => {
          const count = usage(t.name)
          const isOpen = open?.name === t.name ? open.picker : null
          return (
            <li
              key={t.name}
              ref={(n) => {
                if (n) rows.current.set(t.name, n)
                else rows.current.delete(t.name)
              }}
              className={`tag-table-row${dragging === t.name ? ' is-dragging' : ''}`}
            >
              <div className="tag-table-main">
                <button
                  type="button"
                  className="tag-handle"
                  aria-label={`Move ${t.name} (arrow keys)`}
                  title="Drag to reorder"
                  onPointerDown={(e) => startDrag(t.name, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      move(t.name, e.key === 'ArrowUp' ? -1 : 1)
                    }
                  }}
                >
                  <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
                    {[3, 9, 15].map((y) => [4, 10].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />))}
                  </svg>
                </button>
                <button
                  type="button"
                  className={`tag-color-btn${isOpen === 'color' ? ' is-open' : ''}`}
                  style={t.color ? { background: t.color } : undefined}
                  aria-label={`Colour for ${t.name}`}
                  aria-expanded={isOpen === 'color'}
                  onClick={() => setOpen(isOpen === 'color' ? null : { name: t.name, picker: 'color' })}
                />
                <button
                  type="button"
                  className={`tag-icon-btn${isOpen === 'icon' ? ' is-open' : ''}`}
                  style={t.color ? { background: t.color, color: t.fg } : undefined}
                  aria-label={`Icon for ${t.name}`}
                  aria-expanded={isOpen === 'icon'}
                  onClick={() => setOpen(isOpen === 'icon' ? null : { name: t.name, picker: 'icon' })}
                >
                  {t.icon ? <LabelIconView name={t.icon} size={18} /> : <span className="small">–</span>}
                </button>
                <input
                  className="tag-name-input"
                  defaultValue={t.name}
                  key={t.name}
                  aria-label={`Name of ${t.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') {
                      e.currentTarget.value = t.name
                      e.currentTarget.blur()
                    }
                  }}
                  onBlur={(e) => {
                    const v = e.currentTarget.value
                    if (normalizeTag(v) && normalizeTag(v) !== t.name) rename(t, v)
                    else e.currentTarget.value = t.name
                  }}
                />
                <span className="muted small tag-count">{count || 'unused'}</span>
                <button type="button" className="icon-btn tag-delete" aria-label={`Delete ${t.name}`} title="Delete" onClick={() => remove(t)}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
              {isOpen === 'color' && (
                <div className="tag-picker">
                  <ColorPalette value={t.color} onChange={(color) => store(t, { color })} none="No colour" />
                </div>
              )}
              {isOpen === 'icon' && (
                <div className="tag-picker">
                  <IconPicker value={t.icon} color={t.color} fg={t.fg} iconColor={t.label?.iconColor ?? null} onChange={(icon) => store(t, { icon })} onColorChange={(iconColor) => store(t, { iconColor })} />
                </div>
              )}
            </li>
          )
        })}
        {tags.length === 0 && <li className="muted small">No tags yet. Add tags to entries, or add one below.</li>}
      </ul>
      <form
        className="tag-add"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Icon name="plus" size={16} />
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add a tag, e.g. Onsen" aria-label="New tag name" />
        <button type="submit" className="secondary-btn" disabled={!normalizeTag(newName)}>
          Add
        </button>
      </form>
    </Sheet>
  )
}

/** Searchable grid of Lucide icons (suggestions first; search covers the whole set), then the icon's colour. */
function IconPicker({ value, color, fg, iconColor, onChange, onColorChange }: { value: string | null; color: string | null; fg: string; iconColor: string | null; onChange: (icon: string | null) => void; onColorChange: (c: string | null) => void }) {
  const [q, setQ] = useState('')
  useLucide()
  const current = value ? lucideName(value) : null
  const query = q.trim().toLowerCase().replace(/[\s_]+/g, '-')
  const names = query
    ? lucideNames().filter((n) => n.includes(query)).slice(0, 160)
    : [...SUGGESTED_ICONS, ...(current && !SUGGESTED_ICONS.includes(current) ? [current] : [])]
  return (
    <>
      <div className="icon-search">
        <input placeholder="Search all icons, e.g. sushi, temple, train" aria-label="Search icons" autoFocus value={q} onChange={(e) => setQ(e.target.value)} />
        <a className="small" href="https://lucide.dev/icons/" target="_blank" rel="noreferrer">
          Browse all
        </a>
      </div>
      <div className="icon-grid">
        {!query && (
          <button type="button" className={`icon-choice${!value ? ' is-on' : ''}`} aria-label="No icon" aria-pressed={!value} onClick={() => onChange(null)}>
            <span className="small">none</span>
          </button>
        )}
        {names.map((name) => {
          const on = current === name
          return (
            <button
              key={name}
              type="button"
              className={`icon-choice${on ? ' is-on' : ''}`}
              style={on && color ? { background: color, borderColor: color, color: fg } : undefined}
              aria-label={name.replace(/-/g, ' ')}
              title={name}
              aria-pressed={on}
              onClick={() => onChange(name)}
            >
              <LabelIconView name={name} size={22} />
            </button>
          )
        })}
        {query && names.length === 0 && <p className="muted small">No icons match “{q}”.</p>}
      </div>
      <div className="icon-letters">
        <label htmlFor="icon-letters-input" className="field-label">
          Or use letters
        </label>
        <input
          id="icon-letters-input"
          maxLength={2}
          placeholder="e.g. K or JR"
          value={iconLetters(value) ?? ''}
          onChange={(e) => onChange(e.target.value.trim() ? 'text:' + e.target.value.trim().slice(0, 2) : null)}
        />
      </div>
      <div className="icon-colour">
        <ColorField label="Icon colour" value={iconColor} onChange={onColorChange} none="Automatic" emptyText="Automatic (white or dark)" />
      </div>
    </>
  )
}

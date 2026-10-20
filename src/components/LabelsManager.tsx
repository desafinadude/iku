import { useRef, useState } from 'react'
import { DEFAULT_LABEL_ID } from '../data/normalize'
import { iconName, SUGGESTED_ICONS } from '../labels/icons'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels, type TagStyle } from '../labels/LabelsContext'
import { normalizeTag, uid } from '../lib'
import { ColorSwatches } from './ColorSwatches'
import { onColor } from '../colors'
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

  const store = (t: TagStyle, patch: { color?: string | null; icon?: string | null }) =>
    onSave([{ id: labelId(t), tripId, kind: 'tag', name: t.name, color: patch.color !== undefined ? patch.color : t.color, icon: patch.icon !== undefined ? patch.icon : t.icon, sort: t.label?.sort ?? nextSort() }])

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
    return names.map((n) => byName.get(n)!).map((t, i) => ({ id: labelId(t), tripId, kind: 'tag' as const, name: t.name, color: t.color, icon: t.icon, sort: i + 1 }))
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

  // Dragging a row by its handle (mouse or touch): the row moves to wherever the pointer is.
  const startDrag = (name: string, e: React.PointerEvent) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setOpen(null)
    setDragging(name)
    setDragOrder(tags.map((t) => t.name))
  }
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging || !dragOrder) return
    const others = dragOrder.filter((n) => n !== dragging)
    let at = others.length
    for (let i = 0; i < others.length; i++) {
      const r = rows.current.get(others[i])?.getBoundingClientRect()
      if (r && e.clientY < r.top + r.height / 2) {
        at = i
        break
      }
    }
    const next = [...others.slice(0, at), dragging, ...others.slice(at)]
    if (next.join('\n') !== dragOrder.join('\n')) setDragOrder(next)
  }
  const endDrag = () => {
    if (dragOrder && dragOrder.join('\n') !== tags.map((t) => t.name).join('\n')) saveOrder(dragOrder)
    setDragging(null)
    setDragOrder(null)
  }

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
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
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
                  style={t.color ? { background: t.color, color: onColor(t.color) } : undefined}
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
                  <ColorSwatches value={t.color} onChange={(color) => store(t, { color })} none={{ label: 'No colour' }} />
                </div>
              )}
              {isOpen === 'icon' && (
                <div className="tag-picker">
                  <IconPicker value={t.icon} color={t.color} onChange={(icon) => store(t, { icon })} />
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

/** Searchable grid of Material Symbols, plus any name typed in full. */
function IconPicker({ value, color, onChange }: { value: string | null; color: string | null; onChange: (icon: string | null) => void }) {
  const [q, setQ] = useState('')
  const names = [
    // A typed name that isn't suggested is offered as-is (any Material Symbol works).
    ...(q && /^[a-z0-9_]+$/.test(q) && !SUGGESTED_ICONS.includes(q) ? [q] : []),
    ...SUGGESTED_ICONS.filter((n) => !q || n.includes(q)),
    ...(value && !SUGGESTED_ICONS.includes(iconName(value)) && !q ? [iconName(value)] : [])
  ]
  return (
    <>
      <div className="icon-search">
        <input
          placeholder="Search, or type any name from fonts.google.com/icons"
          aria-label="Search icons"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value.toLowerCase().trim().replace(/\s+/g, '_'))}
        />
        <a className="small" href="https://fonts.google.com/icons?icon.style=Rounded" target="_blank" rel="noreferrer">
          Browse all
        </a>
      </div>
      <div className="icon-grid">
        {!q && (
          <button type="button" className={`icon-choice${!value ? ' is-on' : ''}`} aria-label="No icon" aria-pressed={!value} onClick={() => onChange(null)}>
            <span className="small">none</span>
          </button>
        )}
        {names.map((name) => {
          const on = !!value && iconName(value) === name
          return (
            <button
              key={name}
              type="button"
              className={`icon-choice${on ? ' is-on' : ''}`}
              style={on && color ? { background: color, borderColor: color, color: onColor(color) } : undefined}
              aria-label={name.replace(/_/g, ' ')}
              title={name}
              aria-pressed={on}
              onClick={() => onChange(name)}
            >
              <LabelIconView name={name} size={22} />
            </button>
          )
        })}
      </div>
    </>
  )
}

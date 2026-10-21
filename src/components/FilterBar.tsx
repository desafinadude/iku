import { useEffect, useRef, useState } from 'react'
import { activeFilterCount } from '../lib'
import { onColor } from '../colors'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Filters, Item } from '../types'
import { Icon } from './Icon'
import { useMediaQuery } from '../useMediaQuery'

interface Props {
  filters: Filters
  items: Item[]
  onChange: (f: Filters) => void
  onMore: () => void
}

export function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

/** Search, a Tags dropdown (coloured tags with checkboxes), the chosen tags as chips, and More filters. */
export function FilterBar({ filters, items, onChange, onMore }: Props) {
  const { tagStyle, tags } = useLabels()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  // Phones: search is just an icon until it's needed, so tags and filters get the row.
  const narrow = useMediaQuery('(max-width: 899px)')
  const [searchOpen, setSearchOpen] = useState(!!filters.search)
  const showSearch = !narrow || searchOpen || !!filters.search
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
  const count = (t: string) => items.filter((x) => x.tags.includes(t)).length
  const others = activeFilterCount(filters) - filters.tags.length - (filters.search ? 1 : 0)
  // Coloured tags first (in their manager order), then the rest by use; unused ones only when chosen.
  const list = tags.map((t) => t.name).filter((t) => (count(t) > 0 || filters.tags.includes(t)) && t.toLowerCase().includes(q.trim().toLowerCase()))

  const chip = (tag: string, removable: boolean) => {
    const st = tagStyle(tag)
    return (
      <span className={`filter-tag${st.color ? ' is-solid' : ''}`} style={st.color ? { background: st.color, color: onColor(st.color) } : undefined}>
        {st.icon && <LabelIconView name={st.icon} size={14} />}
        {tag}
        {removable && (
          <button type="button" aria-label={`Stop filtering by ${tag}`} onClick={() => onChange({ ...filters, tags: filters.tags.filter((t) => t !== tag) })}>
            <Icon name="close" size={12} strokeWidth={2.6} />
          </button>
        )}
      </span>
    )
  }

  return (
    <div className="filter-bar">
      {showSearch ? (
        <label className="search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search trip</span>
          <input
            type="search"
            placeholder="Search places, notes, links"
            value={filters.search}
            autoFocus={narrow && searchOpen && !filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
          {narrow && (
            <button
              type="button"
              className="search-close"
              aria-label="Close search"
              onClick={() => {
                onChange({ ...filters, search: '' })
                setSearchOpen(false)
              }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </label>
      ) : (
        <button type="button" className="icon-btn filter-icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <Icon name="search" size={18} />
        </button>
      )}
      <div className="menu-wrap tag-filter" ref={ref}>
        <button className={`chip tag-filter-btn${filters.tags.length ? ' is-on' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          Tags{filters.tags.length ? ` (${filters.tags.length})` : ''}
          <Icon name="chevronDown" size={14} />
        </button>
        {open && (
          <div className="menu tag-filter-menu" role="menu" aria-label="Filter by tag">
            <div className="tag-filter-top">
              <input type="search" placeholder="Find a tag" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a tag" autoFocus />
              {filters.tags.length > 0 && (
                <button type="button" className="text-btn" onClick={() => onChange({ ...filters, tags: [] })}>
                  Clear
                </button>
              )}
            </div>
            <div className="tag-filter-list">
              {list.map((t) => (
                <label key={t} className="menu-item menu-check-item tag-filter-row">
                  <input type="checkbox" checked={filters.tags.includes(t)} onChange={() => onChange({ ...filters, tags: toggle(filters.tags, t) })} />
                  {chip(t, false)}
                  <span className="chip-count">{count(t)}</span>
                </label>
              ))}
              {list.length === 0 && <p className="menu-hint">No tags match.</p>}
            </div>
            <label className="menu-item menu-check-item tag-filter-all">
              <input type="checkbox" checked={filters.matchAllTags} onChange={(e) => onChange({ ...filters, matchAllTags: e.target.checked })} />
              Only entries with all chosen tags
            </label>
          </div>
        )}
      </div>
      <div className="chip-scroll filter-chosen">
        {filters.tags.map((t) => (
          <span key={t}>{chip(t, true)}</span>
        ))}
      </div>
      {narrow ? (
        <button className={`icon-btn filter-icon-btn${others > 0 ? ' is-on' : ''}`} aria-label={others > 0 ? `More filters (${others} on)` : 'More filters'} onClick={onMore}>
          <Icon name="filter" size={18} />
          {others > 0 && <span className="filter-dot">{others}</span>}
        </button>
      ) : (
        <button className="chip chip-more" onClick={onMore}>
          <Icon name="filter" size={14} /> {others > 0 ? `More filters (${others})` : 'More filters'}
        </button>
      )}
    </div>
  )
}

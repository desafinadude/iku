import { useState } from 'react'
import { iconName, SUGGESTED_ICONS } from '../labels/icons'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels, type TagStyle } from '../labels/LabelsContext'
import { normalizeTag, uid } from '../lib'
import { LABEL_COLORS, type Item, type Label } from '../types'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

interface Props {
  tripId: string
  items: Item[]
  initialTab?: Label['kind']
  onSave: (labels: Label[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (kind: Label['kind'], from: string, to: string) => Promise<void>
  onDeleteTag: (tag: string) => Promise<void>
  onClose: () => void
}

interface Draft {
  /** Name before editing; null for a new one. */
  original: string | null
  name: string
  color: string | null
  icon: string | null
}

export function LabelsManager({ tripId, items, initialTab = 'type', onSave, onDelete, onRename, onDeleteTag, onClose }: Props) {
  const { types, tags, labels } = useLabels()
  const [tab, setTab] = useState<Label['kind']>(initialTab)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [moveTo, setMoveTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [iconQuery, setIconQuery] = useState('')

  const typeRows = labels.filter((l) => l.kind === 'type')
  const rowFor = (kind: Label['kind'], name: string) => labels.find((l) => l.kind === kind && l.name === name)
  const usage = (kind: Label['kind'], name: string) => items.filter((x) => (kind === 'type' ? x.type === name : x.tags.includes(name))).length

  /**
   * Until a trip edits its types it uses the built-in list. The first edit saves that list
   * (plus any types found on entries) as the trip's own, so every type can be changed.
   */
  const ensureTypeRows = async (): Promise<Label[]> => {
    if (typeRows.length) return typeRows
    const rows = types.map((t, i) => ({ id: uid(), tripId, kind: 'type' as const, name: t.name, color: t.color, icon: t.icon, sort: i }))
    await onSave(rows)
    return rows
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      setDraft(null)
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      if (!draft) return
      const name = tab === 'tag' ? normalizeTag(draft.name) : draft.name.trim()
      if (!name) return
      const rows = tab === 'type' ? await ensureTypeRows() : labels.filter((l) => l.kind === 'tag')
      const existingTarget = name !== draft.original ? rows.find((l) => l.name === name) ?? (tab === 'tag' && tags.some((t) => t.name === name) ? ({} as Label) : undefined) : undefined
      if (draft.original && name !== draft.original) {
        if (existingTarget && !confirm(`“${name}” already exists. Merge “${draft.original}” into it?`)) return
        await onRename(tab, draft.original, name)
        if (existingTarget) return // merged: keep the target's style
      }
      const current = rows.find((l) => l.name === (draft.original ?? name))
      await onSave([
        {
          id: current?.id ?? uid(),
          tripId,
          kind: tab,
          name,
          color: draft.color,
          icon: draft.icon,
          sort: current?.sort ?? Math.max(0, ...rows.map((l) => l.sort)) + 1
        }
      ])
    })

  const remove = () =>
    run(async () => {
      if (!draft?.original) return
      const n = usage(tab, draft.original)
      if (tab === 'tag') {
        if (!confirm(n ? `Remove ${draft.original} from ${n} ${n === 1 ? 'entry' : 'entries'}?` : `Delete ${draft.original}?`)) return
        await onDeleteTag(draft.original)
        return
      }
      const rows = await ensureTypeRows()
      if (n && !moveTo) return
      if (n) await onRename('type', draft.original, moveTo)
      else {
        const row = rows.find((l) => l.name === draft.original)
        if (row) await onDelete(row.id)
      }
    })

  const list: (TagStyle & { count: number })[] =
    tab === 'type' ? types.map((t) => ({ ...t, count: usage('type', t.name) })) : tags.map((t) => ({ ...t, count: usage('tag', t.name) }))

  const editor = draft && (
    <div className="label-editor">
      <div className="label-preview">
        <span className="label-swatch" style={{ background: draft.color ?? '#e3e5e0', color: draft.color ? '#fff' : 'var(--ink-2)' }}>
          <LabelIconView name={draft.icon} size={24} />
        </span>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="label-name">{tab === 'type' ? 'Type name' : 'Tag'}</label>
          <input id="label-name" value={draft.name} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={tab === 'type' ? 'e.g. Onsen' : '#tag'} />
        </div>
      </div>
      <fieldset className="group">
        <legend>Colour</legend>
        <div className="swatches">
          {tab === 'tag' && (
            <button type="button" className={`swatch swatch-none${!draft.color ? ' is-on' : ''}`} aria-label="No colour" aria-pressed={!draft.color} onClick={() => setDraft({ ...draft, color: null })} />
          )}
          {LABEL_COLORS.map((c) => (
            <button key={c} type="button" className={`swatch${draft.color === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={draft.color === c} onClick={() => setDraft({ ...draft, color: c })} />
          ))}
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>Icon</legend>
        <div className="icon-search">
          <label className="sr-only" htmlFor="icon-q">Search icons</label>
          <input
            id="icon-q"
            placeholder="Search, or type any name from fonts.google.com/icons"
            value={iconQuery}
            onChange={(e) => setIconQuery(e.target.value.toLowerCase().trim().replace(/\s+/g, '_'))}
          />
          <a className="small" href="https://fonts.google.com/icons?icon.style=Rounded" target="_blank" rel="noreferrer">
            Browse all
          </a>
        </div>
        <div className="icon-grid">
          {tab === 'tag' && !iconQuery && (
            <button type="button" className={`icon-choice${!draft.icon ? ' is-on' : ''}`} aria-label="No icon" aria-pressed={!draft.icon} onClick={() => setDraft({ ...draft, icon: null })}>
              <span className="small">none</span>
            </button>
          )}
          {[
            // A typed name that isn't suggested is offered as-is (any Material Symbol works).
            ...(iconQuery && /^[a-z0-9_]+$/.test(iconQuery) && !SUGGESTED_ICONS.includes(iconQuery) ? [iconQuery] : []),
            ...SUGGESTED_ICONS.filter((n) => !iconQuery || n.includes(iconQuery)),
            ...(draft.icon && !SUGGESTED_ICONS.includes(iconName(draft.icon)) && !iconQuery ? [iconName(draft.icon)] : [])
          ].map((name) => {
            const on = iconName(draft.icon) === name
            return (
              <button
                key={name}
                type="button"
                className={`icon-choice${on ? ' is-on' : ''}`}
                style={on && draft.color ? { background: draft.color, borderColor: draft.color, color: '#fff' } : undefined}
                aria-label={name.replace(/_/g, ' ')}
                title={name}
                aria-pressed={on}
                onClick={() => setDraft({ ...draft, icon: name })}
              >
                <LabelIconView name={name} size={22} />
              </button>
            )
          })}
        </div>
      </fieldset>
      {draft.original && tab === 'type' && usage('type', draft.original) > 0 && (
        <div className="field">
          <label htmlFor="move-to">If deleted, move its {usage('type', draft.original)} entries to</label>
          <select id="move-to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            <option value="">Choose a type…</option>
            {types
              .filter((t) => t.name !== draft.original)
              .map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="label-actions">
        {draft.original && (
          <button
            type="button"
            className="secondary-btn danger-text"
            disabled={busy || (tab === 'type' && (types.length < 2 || (usage('type', draft.original) > 0 && !moveTo)))}
            onClick={remove}
          >
            <Icon name="trash" size={16} /> Delete
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="text-btn" onClick={() => setDraft(null)}>
          Cancel
        </button>
        <button type="button" className="primary-btn" disabled={busy || !draft.name.trim()} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )

  return (
    <Sheet title="Types & tags" onClose={onClose}>
      <div className="seg" role="tablist" aria-label="What to manage">
        {(['type', 'tag'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'is-on' : ''}
            onClick={() => {
              setTab(k)
              setDraft(null)
            }}
          >
            {k === 'type' ? `Types · ${types.length}` : `Tags · ${tags.length}`}
          </button>
        ))}
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {tab === 'type'
          ? 'Every entry has one type. Its colour and icon are used on cards and map pins.'
          : 'Entries can have many tags. Give a tag a colour or icon to spot it on cards, and to colour the map by tag. Rename a tag to an existing one to merge them.'}
      </p>
      <ul className="label-list">
        {list.map((s) => (
          <li key={s.name}>
            {draft?.original === s.name ? (
              editor
            ) : (
              <button
                type="button"
                className="label-row"
                onClick={() => {
                  setMoveTo('')
                  setIconQuery('')
                  setDraft({ original: s.name, name: s.name, color: s.color, icon: s.icon ?? (tab === 'type' ? 'location_on' : null) })
                }}
              >
                <span className="label-swatch" style={{ background: s.color ?? '#eef0ec', color: s.color ? '#fff' : 'var(--ink-2)' }}>
                  {s.icon ? <LabelIconView name={s.icon} size={20} /> : <span className="small">#</span>}
                </span>
                <span className="label-name">{s.name}</span>
                <span className="muted small">{s.count ? `${s.count} ${s.count === 1 ? 'entry' : 'entries'}` : 'unused'}</span>
                {!rowFor(tab, s.name) && tab === 'tag' && <span className="muted small">· no style</span>}
                <Icon name="chevronRight" size={16} />
              </button>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="muted small">No tags yet. Add tags to entries, or create one here.</li>}
        {draft && draft.original === null && <li>{editor}</li>}
      </ul>
      {!draft && (
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setDraft({ original: null, name: tab === 'tag' ? '#' : '', color: LABEL_COLORS[(list.length * 5) % LABEL_COLORS.length], icon: tab === 'type' ? 'star' : null })}
        >
          <Icon name="plus" size={16} /> {tab === 'type' ? 'New type' : 'New tag'}
        </button>
      )}
    </Sheet>
  )
}

import { useState } from 'react'
import { DEFAULT_LABEL_ID } from '../data/normalize'
import { iconName, SUGGESTED_ICONS } from '../labels/icons'
import { LabelIconView } from '../labels/LabelIconView'
import { useLabels } from '../labels/LabelsContext'
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

interface Draft {
  /** Name before editing; null for a new tag. */
  original: string | null
  name: string
  color: string | null
  icon: string | null
}

export function LabelsManager({ tripId, items, onSave, onRename, onDeleteTag, onClose }: Props) {
  const { tags } = useLabels()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [iconQuery, setIconQuery] = useState('')

  const usage = (name: string) => items.filter((x) => x.tags.includes(name)).length
  const find = (name: string) => tags.find((t) => t.name.toLowerCase() === name.toLowerCase())

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
      const name = normalizeTag(draft.name)
      if (!name) return
      const target = find(name)
      if (draft.original && name !== draft.original) {
        const merging = target && target.name !== draft.original
        if (merging && !confirm(`“${target.name}” already exists. Merge “${draft.original}” into it?`)) return
        await onRename('tag', draft.original, merging ? target.name : name)
        if (merging) return // keep the existing tag's style
      }
      const current = find(draft.original ?? name)?.label
      // Built-in styles aren't stored yet; saving one stores it as the trip's own.
      const id = current && !current.id.startsWith(DEFAULT_LABEL_ID) ? current.id : uid()
      await onSave([{ id, tripId, kind: 'tag', name, color: draft.color, icon: draft.icon, sort: current?.sort ?? Math.max(0, ...tags.map((t) => t.label?.sort ?? 0)) + 1 }])
    })

  const remove = () =>
    run(async () => {
      if (!draft?.original) return
      const n = usage(draft.original)
      if (!confirm(n ? `Remove “${draft.original}” from ${n} ${n === 1 ? 'entry' : 'entries'}?` : `Delete “${draft.original}”?`)) return
      await onDeleteTag(draft.original)
    })

  const editor = draft && (
    <div className="label-editor">
      <div className="label-preview">
        <span className="label-swatch" style={{ background: draft.color ?? '#e3e5e0', color: draft.color ? onColor(draft.color) : 'var(--ink-2)' }}>
          {draft.icon ? <LabelIconView name={draft.icon} size={24} /> : <span className="small">Aa</span>}
        </span>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="label-name">Tag</label>
          <input id="label-name" value={draft.name} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Onsen, Must do" />
        </div>
      </div>
      <fieldset className="group">
        <legend>Colour</legend>
        <ColorSwatches value={draft.color} onChange={(color) => setDraft({ ...draft, color })} none={{ label: 'No colour' }} />
      </fieldset>
      <fieldset className="group">
        <legend>Icon</legend>
        <div className="icon-search">
          <label className="sr-only" htmlFor="icon-q">
            Search icons
          </label>
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
          {!iconQuery && (
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
            const on = !!draft.icon && iconName(draft.icon) === name
            return (
              <button
                key={name}
                type="button"
                className={`icon-choice${on ? ' is-on' : ''}`}
                style={on && draft.color ? { background: draft.color, borderColor: draft.color, color: onColor(draft.color) } : undefined}
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
      <div className="label-actions">
        {draft.original && (
          <button type="button" className="secondary-btn danger-text" disabled={busy} onClick={remove}>
            <Icon name="trash" size={16} /> Delete
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="text-btn" onClick={() => setDraft(null)}>
          Cancel
        </button>
        <button type="button" className="primary-btn" disabled={busy || !normalizeTag(draft.name)} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )

  return (
    <Sheet title="Tags" onClose={onClose}>
      <p className="muted small" style={{ margin: 0 }}>
        Give a tag a colour and icon to make it stand out. An entry’s first coloured tag sets the colour of its card and map pin. Rename a tag to an existing one to merge them.
      </p>
      <ul className="label-list">
        {tags.map((s) => {
          const count = usage(s.name)
          return (
            <li key={s.name}>
              {draft?.original === s.name ? (
                editor
              ) : (
                <button
                  type="button"
                  className="label-row"
                  onClick={() => {
                    setIconQuery('')
                    setDraft({ original: s.name, name: s.name, color: s.color, icon: s.icon })
                  }}
                >
                  <span className="label-swatch" style={{ background: s.color ?? '#eef0ec', color: s.color ? onColor(s.color) : 'var(--ink-2)' }}>
                    {s.icon ? <LabelIconView name={s.icon} size={20} /> : <span className="small">Aa</span>}
                  </span>
                  <span className="label-name">{s.name}</span>
                  <span className="muted small">{count ? `${count} ${count === 1 ? 'entry' : 'entries'}` : 'unused'}</span>
                  <Icon name="chevronRight" size={16} />
                </button>
              )}
            </li>
          )
        })}
        {tags.length === 0 && <li className="muted small">No tags yet. Add tags to entries, or create one here.</li>}
        {draft && draft.original === null && <li>{editor}</li>}
      </ul>
      {!draft && (
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            setIconQuery('')
            setDraft({ original: null, name: '', color: LABEL_COLORS[(tags.length * 5) % LABEL_COLORS.length], icon: 'star' })
          }}
        >
          <Icon name="plus" size={16} /> New tag
        </button>
      )}
    </Sheet>
  )
}

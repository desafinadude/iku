import { COLOR_ROWS } from '../colors'

const ALL = new Set(COLOR_ROWS.flatMap((r) => r.colors.map((c) => c.toUpperCase())))

/**
 * The colour picker: pastel, light, bright and deep rows across 16 hues, the original muted colours, and a
 * custom swatch that opens the device's own picker. An optional "none" choice comes first.
 */
export function ColorSwatches({ value, onChange, none }: { value: string | null; onChange: (color: string | null) => void; none?: { label: string; color?: string | null } }) {
  const v = value?.toUpperCase() ?? null
  const custom = !!v && !ALL.has(v)
  return (
    <div className="swatch-grid">
      <div className="swatch-extra">
        {none && (
          <button type="button" className={`swatch swatch-none${!value ? ' is-on' : ''}`} aria-label={none.label} title={none.label} aria-pressed={!value} onClick={() => onChange(null)} style={none.color ? { background: none.color } : undefined} />
        )}
        <label className={`swatch swatch-custom${custom ? ' is-on' : ''}`} title="Any colour" style={custom ? { background: value! } : undefined}>
          <span className="sr-only">Any colour</span>
          <input type="color" value={value ?? '#3a5ba0'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </label>
        <span className="muted small">{custom ? `Custom ${v}` : 'Or pick any colour'}</span>
      </div>
      {COLOR_ROWS.map((row) => (
        <div key={row.name} className="swatch-row" role="group" aria-label={row.name}>
          {row.colors.map((c) => (
            <button key={c} type="button" className={`swatch${v === c.toUpperCase() ? ' is-on' : ''}`} style={{ background: c }} aria-label={`${row.name} ${c}`} title={c} aria-pressed={v === c.toUpperCase()} onClick={() => onChange(c)} />
          ))}
        </div>
      ))}
    </div>
  )
}

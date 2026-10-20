import { COLOR_ROWS } from '../colors'

/** The colour picker: rows of shades from pastel to deep, with an optional "none" choice first. */
export function ColorSwatches({ value, onChange, none }: { value: string | null; onChange: (color: string | null) => void; none?: { label: string; color?: string | null } }) {
  const v = value?.toUpperCase() ?? null
  return (
    <div className="swatch-grid">
      {none && (
        <button type="button" className={`swatch swatch-none${!value ? ' is-on' : ''}`} aria-label={none.label} title={none.label} aria-pressed={!value} onClick={() => onChange(null)} style={none.color ? { background: none.color } : undefined} />
      )}
      {COLOR_ROWS.map((row, i) => (
        <div key={i} className="swatch-row" role="group" aria-label={['Pastel', 'Light', 'Bright', 'Deep'][i]}>
          {row.map((c) => (
            <button key={c} type="button" className={`swatch${v === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={v === c} onClick={() => onChange(c)} />
          ))}
        </div>
      ))}
    </div>
  )
}

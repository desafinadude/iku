import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'

/** A strip of small squares, one per styled tag, in the tag's colour with its icon. */
export function TagIcons({ tags }: { tags: string[] }) {
  const { tagStyle } = useLabels()
  const styled = tags.map(tagStyle).filter((s) => s.color || s.icon)
  if (!styled.length) return null
  return (
    <div className="tag-icons" aria-label={`Tags: ${tags.join(', ')}`}>
      {styled.map((s) => (
        <span key={s.name} className="tag-icon" title={s.name} style={{ background: s.color ?? 'var(--soft)', color: s.fg }}>
          {s.icon ? <LabelIconView name={s.icon} size={15} /> : <span className="tag-icon-letter">{s.name.slice(0, 1)}</span>}
        </span>
      ))}
    </div>
  )
}

import { useLabels } from '../labels/LabelsContext'
import { onColor } from '../colors'
import { LabelIconView } from '../labels/LabelIconView'

/** An entry's tags: solid colour chips for styled tags, plain grey for the rest. */
export function TagChips({ tags, small = false }: { tags: string[]; small?: boolean }) {
  const { tagStyle } = useLabels()
  if (!tags.length) return null
  return (
    <>
      {tags.map((t) => {
        const st = tagStyle(t)
        return (
          <span key={t} className={`tag${st.color ? ' tag-solid' : ''}${small ? ' tag-small' : ''}`} style={st.color ? { background: st.color, color: onColor(st.color) } : undefined}>
            {st.icon && <LabelIconView name={st.icon} size={small ? 11 : 13} />}
            {t}
          </span>
        )
      })}
    </>
  )
}

import { createElement } from 'react'
import { iconLetters, iconName, lucideName } from './icons'
import { lucideNode, useLucide, type IconNode } from './lucide'

/** A tag icon from Lucide (colour comes from the surrounding text colour); unknown names fall back to Material Symbols. */
export function LabelIconView({ name, size = 16 }: { name: string | null | undefined; size?: number; filled?: boolean }) {
  const ready = useLucide()
  const letters = iconLetters(name)
  if (letters !== null)
    return (
      <span className="icon-letter" style={{ width: size, height: size, fontSize: Math.round(size * (letters.length > 1 ? 0.62 : 0.82)) }} aria-hidden="true">
        {letters}
      </span>
    )
  const node = lucideNode(lucideName(name))
  if (node) return <LucideSvg node={node} size={size} />
  // While the set loads, keep the space so nothing jumps.
  if (!ready) return <span className="icon-slot" style={{ width: size, height: size }} aria-hidden="true" />
  return (
    <span className="msr filled" style={{ fontSize: size }} aria-hidden="true">
      {iconName(name)}
    </span>
  )
}

function LucideSvg({ node, size }: { node: IconNode; size: number }) {
  const [, attrs, children = []] = node
  return (
    <svg {...toProps(attrs)} width={size} height={size} strokeWidth={2.25} aria-hidden="true" className="lucide-icon">
      {children.map(([tag, a], i) => createElement(tag, { key: i, ...toProps(a) }))}
    </svg>
  )
}

/** Lucide attribute names (stroke-width) to React props (strokeWidth). */
const toProps = (a: Record<string, string | number>) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]))

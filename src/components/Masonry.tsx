import type { ReactNode } from 'react'

/**
 * Tiles in a set number of columns, dealt across the columns left to right.
 * Plain flex columns rather than CSS multi-column, which Safari sometimes fails to paint inside a scroller.
 */
export function Masonry({ children, columns, gap, className = '' }: { children: ReactNode[]; columns: number; gap: number; className?: string }) {
  const count = Math.max(1, columns)
  const cols: ReactNode[][] = Array.from({ length: count }, () => [])
  children.forEach((c, i) => cols[i % count].push(c))
  return (
    <div className={`masonry ${className}`}>
      <div className="masonry-cols" style={{ gap }}>
        {cols.map((col, i) => (
          <div key={i} className="masonry-col" style={{ gap }}>
            {col}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Tiles laid out in as many columns as fit (at least `minWidth` px each), dealt across the columns left to right.
 * Plain flex columns rather than CSS multi-column, which Safari sometimes fails to paint inside a scroller.
 */
export function Masonry({ children, minWidth, gap, className = '' }: { children: ReactNode[]; minWidth: number; gap: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(2)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight)
      setCount(Math.max(1, Math.floor((w + gap) / (minWidth + gap))))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [minWidth, gap])
  const cols: ReactNode[][] = Array.from({ length: count }, () => [])
  children.forEach((c, i) => cols[i % count].push(c))
  return (
    <div ref={ref} className={`masonry ${className}`}>
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

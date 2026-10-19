import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  headerAction?: ReactNode
}

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Sheet({ title, onClose, children, footer, headerAction }: Props) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // With sheets stacked, Escape closes only the top one.
      const sheets = document.querySelectorAll('.sheet')
      if (e.key === 'Escape' && sheets[sheets.length - 1] === ref.current) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section ref={ref} role="dialog" aria-modal="true" aria-label={title} className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{title}</h2>
          {headerAction}
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </section>
    </div>
  )
}

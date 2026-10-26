import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { CardImage } from './CardImage'
import { Icon } from './Icon'

/** Full-screen view of an entry's image. Escape, the close button or a tap beside the image closes it (and only it). */
export function Lightbox({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  // On the page itself, so no sheet around it (with its own scrolling or transform) can trap it.
  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Image">
      <button className="icon-btn viewer-close" aria-label="Close" onClick={onClose}>
        <Icon name="close" />
      </button>
      {/* A tap beside the image closes it; the image itself scrolls (and pinch-zooms on phones). */}
      <div className="viewer-body" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <CardImage imageUrl={imageUrl} loading="eager" />
      </div>
    </div>,
    document.body
  )
}

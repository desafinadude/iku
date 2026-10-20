import { useEffect } from 'react'
import { CardImage } from './CardImage'
import { Icon } from './Icon'

/** Full-screen view of an entry's image. Escape or a click closes it (and only it). */
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
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Image" onClick={onClose}>
      <header className="viewer-head" onClick={(e) => e.stopPropagation()}>
        <b className="viewer-title">Image</b>
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="viewer-body">
        <CardImage imageUrl={imageUrl} loading="eager" />
      </div>
    </div>
  )
}

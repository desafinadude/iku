import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import type { Attachment } from '../types'
import { Icon } from './Icon'
import { PdfPages } from './PdfPages'

/**
 * Opens a file inside the app. Opening a new tab after an async lookup gets blocked as a
 * popup (and is unreliable in an installed iPhone app), so we show it here with a plain link out.
 */
export function FileViewer({ attachment, getUrl, onClose }: { attachment: Attachment; getUrl: (a: Attachment) => Promise<string>; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let made: string | null = null
    getUrl(attachment)
      .then((u) => {
        made = u
        setUrl(u)
      })
      .catch((e) => setError((e as Error).message || 'Couldn’t open that file. Are you offline?'))
    return () => {
      if (made?.startsWith('blob:')) URL.revokeObjectURL(made)
    }
  }, [attachment, getUrl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isImage = attachment.mime?.startsWith('image/')
  const isPdf = attachment.mime === 'application/pdf'

  // On the page itself, so no sheet around it (with its own scrolling or transform) can trap it.
  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={attachment.name}>
      <button className="icon-btn viewer-close" aria-label="Close" onClick={onClose}>
        <Icon name="close" />
      </button>
      <div className="viewer-body">
        {error && <p className="error">{error}</p>}
        {!url && !error && <p className="muted">Opening…</p>}
        {url && isImage && <img src={url} alt={attachment.name} />}
        {url && isPdf && <PdfPages url={url} name={attachment.name} />}
        {url && !isImage && !isPdf && (
          <div className="viewer-other">
            <p className="muted">
              <b>{attachment.name}</b> can’t be previewed here.
            </p>
            <a className="secondary-btn" href={url} target="_blank" rel="noreferrer" download={url.startsWith('blob:') ? attachment.name : undefined}>
              <Icon name="external" size={16} /> Open
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

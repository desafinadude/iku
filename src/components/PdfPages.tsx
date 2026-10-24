import { useEffect, useRef, useState } from 'react'

/**
 * A PDF drawn page by page with PDF.js, in a plain scrolling column. Embedding the file in an iframe shows only
 * the first page on iPhones and iPads, and can't be scrolled there.
 */
export function PdfPages({ url, name }: { url: string; name: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'busy' | 'done' | 'error'>('busy')
  const [pages, setPages] = useState(0)

  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null
    ;(async () => {
      try {
        // Loaded only when a PDF is opened.
        const pdfjs = await import('pdfjs-dist')
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const doc = await pdfjs.getDocument({ url }).promise
        destroy = () => void doc.destroy()
        if (cancelled) return
        setPages(doc.numPages)
        const width = Math.min(box.current?.clientWidth ?? 800, 900)
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        for (let n = 1; n <= Math.min(doc.numPages, 60) && !cancelled; n++) {
          const page = await doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.setAttribute('aria-label', `${name}, page ${n}`)
          box.current?.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
        }
        if (!cancelled) setState('done')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
      destroy?.()
      if (box.current) box.current.innerHTML = ''
    }
  }, [url, name])

  return (
    <>
      <div className="pdf-pages" ref={box} />
      {state === 'busy' && pages === 0 && <p className="muted">Opening…</p>}
      {state === 'error' && <p className="muted">Couldn’t show this PDF here.</p>}
      {pages > 60 && state === 'done' && <p className="muted">Showing the first 60 of {pages} pages.</p>}
    </>
  )
}

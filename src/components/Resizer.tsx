import { useRef } from 'react'

interface Props {
  label: string
  /** Current width of the pane this handle resizes. */
  width: number
  min: number
  /** Maximum as a share of the window width. */
  maxShare: number
  /** Which side of the handle the pane is on: dragging towards it shrinks it. */
  pane: 'left' | 'right'
  defaultWidth: number
  onLive: (width: number) => void
  onCommit: (width: number) => void
}

/** A drag handle between two panes. Arrow keys nudge it; double-click resets it. */
export function Resizer({ label, width, min, maxShare, pane, defaultWidth, onLive, onCommit }: Props) {
  const start = useRef<{ x: number; w: number } | null>(null)
  const last = useRef(width)
  const clamp = (w: number) => Math.round(Math.min(Math.max(w, min), Math.max(min, window.innerWidth * maxShare)))
  const set = (w: number, commit: boolean) => {
    last.current = clamp(w)
    ;(commit ? onCommit : onLive)(last.current)
  }
  return (
    <div
      className="resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, w: width }
        document.body.classList.add('is-resizing')
      }}
      onPointerMove={(e) => {
        if (!start.current) return
        const dx = e.clientX - start.current.x
        set(start.current.w + (pane === 'left' ? dx : -dx), false)
      }}
      onPointerUp={() => {
        if (!start.current) return
        start.current = null
        document.body.classList.remove('is-resizing')
        onCommit(last.current)
      }}
      onDoubleClick={() => set(defaultWidth, true)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 16
        const grow = pane === 'left' ? 'ArrowRight' : 'ArrowLeft'
        const shrink = pane === 'left' ? 'ArrowLeft' : 'ArrowRight'
        if (e.key === grow) set(width + step, true)
        else if (e.key === shrink) set(width - step, true)
        else return
        e.preventDefault()
      }}
    />
  )
}

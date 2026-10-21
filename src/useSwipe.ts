import { useRef } from 'react'

/**
 * Horizontal swipe handlers for touch screens: a quick sideways flick (mostly horizontal, 60px+) calls
 * onNext (swipe left) or onPrev (swipe right). Vertical scrolling and long-press drags are left alone.
 */
export function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Date.now() - s.t > 600 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      // Not when the swipe started inside something that scrolls sideways (the day strip, chips).
      if ((e.target as HTMLElement).closest('.day-strip, .chip-scroll, .map-days')) return
      if (dx < 0) onNext()
      else onPrev()
    }
  }
}

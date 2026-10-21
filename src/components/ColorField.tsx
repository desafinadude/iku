import { useEffect, useRef, useState } from 'react'
import { colorCss, colorStops, PALETTE } from '../colors'
import { Icon } from './Icon'

interface PaletteProps {
  value: string | null
  onChange: (value: string | null) => void
  /** Label for the "no colour" choice, if there is one. */
  none?: string
  /** Offer a two-colour, top-to-bottom gradient. */
  gradient?: boolean
}

/**
 * A short palette: 8 hues in three shades, neutrals, no colour, and any colour via the device's picker.
 * With `gradient`, a tick turns it into two stops (top and bottom); tap a stop, then a colour.
 */
export function ColorPalette({ value, onChange, none, gradient = false }: PaletteProps) {
  const stops = colorStops(value)
  const isGradient = stops.length > 1
  const [stop, setStop] = useState(0)
  const current = (stops[isGradient ? stop : 0] ?? '').toUpperCase()

  const pick = (c: string) => {
    if (!isGradient) return onChange(c)
    const next = [...stops]
    next[stop] = c
    onChange(next.join('>'))
  }

  return (
    <div className="palette">
      {gradient && (
        <div className="palette-gradient">
          <label className="check small-check">
            <input
              type="checkbox"
              checked={isGradient}
              onChange={(e) => {
                const a = stops[0] ?? '#FED7AA'
                onChange(e.target.checked ? `${a}>${a}` : a)
                setStop(e.target.checked ? 1 : 0)
              }}
            />
            Gradient
          </label>
          {isGradient && (
            <div className="palette-stops" role="group" aria-label="Gradient colours">
              {['Top', 'Bottom'].map((label, i) => (
                <button key={label} type="button" className={`palette-stop${stop === i ? ' is-on' : ''}`} aria-pressed={stop === i} onClick={() => setStop(i)}>
                  <span className="palette-stop-chip" style={{ background: stops[i] }} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="palette-grid">
        {PALETTE.flat().map((c) => (
          <button key={c} type="button" className={`palette-swatch${current === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={current === c} onClick={() => pick(c)}>
            {current === c && <Icon name="check" size={14} strokeWidth={3} />}
          </button>
        ))}
      </div>
      <div className="palette-extra">
        {none && !isGradient && (
          <button type="button" className={`chip chip-small${!value ? ' is-on' : ''}`} aria-pressed={!value} onClick={() => onChange(null)}>
            {none}
          </button>
        )}
        <label className="chip chip-small palette-custom">
          <span className="palette-rainbow" aria-hidden="true" />
          Any colour
          <input type="color" value={current || '#3b82f6'} onChange={(e) => pick(e.target.value.toUpperCase())} />
        </label>
      </div>
    </div>
  )
}

/** A colour setting: a labelled box showing the colour; tap it for the palette. */
export function ColorField({ label, value, onChange, none, gradient, emptyText = 'None' }: PaletteProps & { label: string; emptyText?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])
  return (
    <div className="color-field" ref={ref}>
      <button type="button" className="color-field-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={`color-field-chip${value ? '' : ' is-empty'}`} style={{ background: colorCss(value) }} />
        <span className="color-field-label">{label}</span>
        <span className="muted small">{value ? (colorStops(value).length > 1 ? 'Gradient' : '') : emptyText}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="color-pop">
          <ColorPalette
            value={value}
            gradient={gradient}
            none={none}
            onChange={(v) => {
              onChange(v)
              // A single colour is one tap; a gradient stays open to set both stops.
              if (!v || colorStops(v).length < 2) setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

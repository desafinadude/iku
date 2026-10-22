import { useEffect, useRef, useState } from 'react'
import { colorCss, colorStops, PALETTE } from '../colors'
import { addRecentColor, useRecentColors } from '../recentColors'
import { Icon } from './Icon'

interface PaletteProps {
  value: string | null
  /** `custom` is true while a colour comes from the device's own picker (it fires as you drag). */
  onChange: (value: string | null, custom?: boolean) => void
  /** Label for the "no colour" choice, if there is one. */
  none?: string
  /** Offer a two-colour, top-to-bottom gradient. */
  gradient?: boolean
  /** Quick White and Black choices at the top (for text and icon colours). */
  quick?: boolean
}

/**
 * The palette: recent colours, then 16 hues in four shades, muted colours and neutrals, plus no colour and any
 * colour via the device's picker. With `gradient`, a tick turns it into two stops (top and bottom); tap a stop,
 * then a colour.
 */
export function ColorPalette({ value, onChange, none, gradient = false, quick = false }: PaletteProps) {
  const recent = useRecentColors()
  const stops = colorStops(value)
  const isGradient = stops.length > 1
  const [stop, setStop] = useState(0)
  const current = (stops[isGradient ? stop : 0] ?? '').toUpperCase()

  const pick = (c: string, custom = false) => {
    // Swatches go straight into the recent colours; the device picker's colour once it's chosen (on blur).
    if (!custom) addRecentColor(c)
    if (!isGradient) return onChange(c, custom)
    const next = [...stops]
    next[stop] = c
    onChange(next.join('>'), custom)
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
      {quick && (
        <div className="palette-quick">
          {[
            ['#FFFFFF', 'White'],
            ['#17201D', 'Black']
          ].map(([c, label]) => (
            <button key={c} type="button" className={`chip chip-small palette-quick-btn${current === c ? ' is-on' : ''}`} aria-pressed={current === c} onClick={() => pick(c)}>
              <span className="palette-stop-chip" style={{ background: c }} />
              {label}
            </button>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="palette-recent">
          <span className="palette-row-label">Recent</span>
          <div className="palette-grid" role="group" aria-label="Recent colours">
            {recent.map((c) => (
              <button key={c} type="button" className={`palette-swatch${current === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Recent ${c}`} title={c} aria-pressed={current === c} onClick={() => pick(c)}>
                {current === c && <Icon name="check" size={12} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="palette-rows">
        {PALETTE.map((row) => (
          <div key={row.name} className="palette-grid" role="group" aria-label={row.name}>
            {row.colors.map((c) => (
              <button key={c} type="button" className={`palette-swatch${current === c.toUpperCase() ? ' is-on' : ''}`} style={{ background: c }} aria-label={`${row.name} ${c}`} title={c} aria-pressed={current === c.toUpperCase()} onClick={() => pick(c)}>
                {current === c.toUpperCase() && <Icon name="check" size={12} strokeWidth={3} />}
              </button>
            ))}
          </div>
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
          <input type="color" defaultValue={(current || "#3B82F6").toLowerCase()} onChange={(e) => pick(e.target.value.toUpperCase(), true)} onBlur={(e) => addRecentColor(e.target.value)} />
        </label>
      </div>
    </div>
  )
}

/** A colour setting: a labelled box showing the colour; tap it for the palette. */
export function ColorField({ label, value, onChange, none, gradient, quick, emptyText = 'None' }: PaletteProps & { label: string; emptyText?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // The device's picker fires as you drag; pass on the colour once it settles.
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const pop = useRef<HTMLDivElement>(null)
  // Bring the whole palette into view when it opens (e.g. on the last row of a list).
  useEffect(() => {
    if (open) pop.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])
  useEffect(() => {
    if (!open) return
    // While the device's colour picker is open (its input has focus), clicks in it aren't "outside".
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      if (ref.current?.contains(document.activeElement) && (document.activeElement as HTMLInputElement).type === 'color') return
      setOpen(false)
    }
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
        <div className="color-pop" ref={pop}>
          <ColorPalette
            value={value}
            gradient={gradient}
            quick={quick}
            none={none}
            onChange={(v, custom) => {
              window.clearTimeout(timer.current)
              if (custom) timer.current = window.setTimeout(() => onChange(v), 250)
              else onChange(v)
              // A single swatch is one tap; a gradient, or the device's picker (which fires as you drag), stays open.
              if (!custom && (!v || colorStops(v).length < 2)) setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

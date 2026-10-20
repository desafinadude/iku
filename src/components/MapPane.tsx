import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dayLabel, displayTitle, itemsForDay } from '../lib'
import { markGoogleBroken, useGoogleOk } from '../maps/config'
import type { MapPin } from '../maps/types'
import { useLabels } from '../labels/LabelsContext'
import { LabelIconView } from '../labels/LabelIconView'
import type { Item } from '../types'
import { Icon } from './Icon'

// Only the renderer in use is downloaded.
const GoogleView = lazy(() => import('../maps/GoogleView').then((m) => ({ default: m.GoogleView })))
const LeafletView = lazy(() => import('../maps/LeafletView').then((m) => ({ default: m.LeafletView })))

interface Props {
  items: Item[]
  days: string[]
  selectedDay: string
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
}

type Located = Item & { lat: number; lng: number }
const located = (x: Item): x is Located => x.lat != null && x.lng != null

export function MapPane({ items, days, selectedDay, onSelectDay, onOpen }: Props) {
  const [showIdeas, setShowIdeas] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [allDays, setAllDays] = useState(false)
  const googleOk = useGoogleOk()
  const { typeStyle, tagStyle, types, tags } = useLabels()
  // Pins take their colour and icon from the type, or from the entry's first styled tag.
  const [colorBy, setColorBy] = useState<'type' | 'tag'>('type')
  const pinStyle = (x: Item) => {
    if (colorBy === 'tag') {
      const st = x.tags.map(tagStyle).find((t) => t.color || t.icon)
      return { color: st?.color ?? '#8a918c', icon: st?.icon ?? 'pin' }
    }
    const s = typeStyle(x.type)
    return { color: s.color, icon: s.icon }
  }

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.sheet')) setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const scopeAll = expanded && allDays
  const stops = useMemo(
    () => (scopeAll ? items.filter((x) => x.day) : itemsForDay(items, selectedDay)).filter(located),
    [items, selectedDay, scopeAll]
  )
  const ideas = useMemo(() => (showIdeas ? items.filter((x) => !x.day).filter(located) : []), [items, showIdeas])
  const l = dayLabel(selectedDay)
  const pins: MapPin[] = [
    ...stops.map((x, i) => ({
      id: x.id,
      lat: x.lat,
      lng: x.lng,
      label: String(scopeAll ? days.indexOf(x.day!) + 1 : i + 1),
      ...pinStyle(x),
      idea: false,
      title: scopeAll ? `Day ${days.indexOf(x.day!) + 1}: ${displayTitle(x)}` : displayTitle(x)
    })),
    ...ideas.map((x) => ({ id: x.id, lat: x.lat, lng: x.lng, label: '', ...pinStyle(x), idea: true, title: displayTitle(x) }))
  ]
  const view = {
    pins,
    route: scopeAll ? [] : stops.map((x) => [x.lat, x.lng] as [number, number]),
    fitKey: `${expanded}-${scopeAll}`,
    expanded,
    onPinClick: (id: string) => {
      const item = items.find((x) => x.id === id)
      if (item) onOpen(item)
    }
  }

  return (
    <section aria-label="Map" className={`pane pane-map${expanded ? ' is-expanded' : ''}`}>
      <div className="pane-head map-head">
        <h2>Map</h2>
        {!expanded && (
          <span className="muted">
            {l.dow} {l.num} {l.month}
          </span>
        )}
        <span className="spacer" />
        <button className="icon-btn map-expand" aria-label={expanded ? 'Close full-screen map' : 'Full-screen map'} onClick={() => setExpanded((v) => !v)}>
          <Icon name={expanded ? 'close' : 'expand'} size={18} />
        </button>
      </div>
      {expanded && (
        <div className="map-days" role="group" aria-label="Show on map">
          <button className={`day-chip${allDays ? ' is-on' : ''}`} aria-pressed={allDays} onClick={() => setAllDays(true)}>
            All days
          </button>
          {days.map((d, i) => {
            const dl = dayLabel(d)
            const on = !allDays && d === selectedDay
            return (
              <button
                key={d}
                className={`day-chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => {
                  setAllDays(false)
                  onSelectDay(d)
                }}
              >
                <span className="small">Day {i + 1}</span> {dl.dow} {dl.num}
              </button>
            )
          })}
        </div>
      )}
      <div className="map-box">
        <Suspense fallback={<div className="map map-loading">Loading map…</div>}>
          {googleOk ? (
            <MapCrashGuard fallback={<LeafletView {...view} />}>
              <GoogleView {...view} />
            </MapCrashGuard>
          ) : (
            <LeafletView {...view} />
          )}
        </Suspense>
        <div className="map-actions">
          <button className="map-btn" aria-pressed={showIdeas} onClick={() => setShowIdeas((v) => !v)}>
            {showIdeas ? 'Hide unplanned ideas' : 'Show unplanned ideas'}
          </button>
        </div>
        {expanded && (
          <div className="map-legend">
            <div className="seg seg-small" role="group" aria-label="Colour pins by">
              <button type="button" className={colorBy === 'type' ? 'is-on' : ''} aria-pressed={colorBy === 'type'} onClick={() => setColorBy('type')}>
                By type
              </button>
              <button type="button" className={colorBy === 'tag' ? 'is-on' : ''} aria-pressed={colorBy === 'tag'} onClick={() => setColorBy('tag')}>
                By tag
              </button>
            </div>
            <ul>
              {(colorBy === 'type'
                ? types.filter((t) => pins.some((p) => items.find((x) => x.id === p.id)?.type === t.name))
                : tags.filter((t) => (t.color || t.icon) && pins.some((p) => items.find((x) => x.id === p.id)?.tags.includes(t.name)))
              ).map((s) => (
                <li key={s.name}>
                  <span className="legend-pin" style={{ background: s.color ?? '#8a918c' }}>
                    <LabelIconView name={s.icon} size={12} />
                  </span>
                  {s.name}
                </li>
              ))}
            </ul>
            {colorBy === 'tag' && !tags.some((t) => t.color || t.icon) && <p className="muted small">Give tags a colour in Manage types &amp; tags.</p>}
            {scopeAll && <p className="muted small">Numbers show the day.</p>}
          </div>
        )}
      </div>
    </section>
  )
}

/** If the Google map throws, show the OpenStreetMap one instead of blanking the app. */
class MapCrashGuard extends Component<{ fallback: ReactNode; children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() {
    return { crashed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Google map failed; falling back to OpenStreetMap.', error)
    markGoogleBroken()
  }
  render() {
    return this.state.crashed ? this.props.fallback : this.props.children
  }
}

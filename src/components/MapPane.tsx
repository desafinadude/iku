import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dayLabel, itemsForDay } from '../lib'
import { markGoogleBroken, useGoogleOk } from '../maps/config'
import type { MapPin } from '../maps/types'
import { TYPE_COLORS, type Item } from '../types'
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
      color: TYPE_COLORS[x.type].fg,
      idea: false,
      title: scopeAll ? `Day ${days.indexOf(x.day!) + 1}: ${x.title}` : x.title
    })),
    ...ideas.map((x) => ({ id: x.id, lat: x.lat, lng: x.lng, label: '', color: '', idea: true, title: x.title }))
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
        {scopeAll && <p className="map-legend">Pins show the day number</p>}
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

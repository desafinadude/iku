import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dayLabel, displayTitle, itemsForDay } from '../lib'
import { markGoogleBroken, useGoogleOk } from '../maps/config'
import type { Bounds, MapPin, MapStyle } from '../maps/types'
import { useAreas } from '../maps/areas'
import type { FoundPlace } from '../maps/places'
import type { Prefs } from '../usePrefs'
import { PlaceCard } from './PlaceCard'
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
  /** Fills the workspace (the Map main view) with the day chips and legend, no full-screen toggle. */
  full?: boolean
  /** Wide screens: the pane's width in px (from its resize handle). */
  width?: number
  /** Map style and layers (kept per device). */
  prefs: Pick<Prefs, 'mapStyle' | 'mapLabels' | 'mapRoute' | 'mapAreas' | 'mapTransit'>
  onPrefs: (patch: Partial<Prefs>) => void
  /** Saves a place tapped on the map as a new idea. */
  onSavePlace: (place: FoundPlace) => Promise<void>
}

type Located = Item & { lat: number; lng: number }
const located = (x: Item): x is Located => x.lat != null && x.lng != null

export function MapPane({ items, days, selectedDay, onSelectDay, onOpen, full = false, width, prefs, onPrefs, onSavePlace }: Props) {
  const [showIdeas, setShowIdeas] = useState(false)
  const [overlay, setExpanded] = useState(false)
  const expanded = overlay || full
  const [allDays, setAllDays] = useState(false)
  const googleOk = useGoogleOk()
  // The pin (or Google place) whose card is open, and the visible area (for the neighbourhood overlay).
  const [selected, setSelected] = useState<{ id: string } | { placeId: string } | null>(null)
  const [visibleArea, setVisibleArea] = useState<{ bounds: Bounds; zoom: number } | null>(null)
  const onView = useCallback((bounds: Bounds, zoom: number) => setVisibleArea({ bounds, zoom }), [])
  const onPoiClick = useCallback((placeId: string) => setSelected({ placeId }), [])
  const onMapClick = useCallback(() => setSelected(null), [])
  const { areas, state: areasState } = useAreas(prefs.mapAreas, visibleArea)
  const [layersOpen, setLayersOpen] = useState(false)
  // The simple style is a quiet light map (CARTO), which Google's map can't be made into with our Map ID.
  const useGoogle = googleOk && prefs.mapStyle !== 'simple'
  const { itemStyle, tags, dayStyle } = useLabels()
  // Pins take their colour and icon from the entry's first coloured tag.
  const pinStyle = (x: Item) => {
    const s = itemStyle(x)
    return { color: s.color, fg: s.fg, icon: s.icon }
  }


  useEffect(() => {
    if (!overlay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.sheet')) setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay])

  const scopeAll = expanded && allDays
  const stops = useMemo(
    () => (scopeAll ? items.filter((x) => x.day) : itemsForDay(items, selectedDay)).filter(located),
    [items, selectedDay, scopeAll]
  )
  const ideas = useMemo(() => (showIdeas ? items.filter((x) => !x.day).filter(located) : []), [items, showIdeas])
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
    route: scopeAll || !prefs.mapRoute ? [] : stops.map((x) => [x.lat, x.lng] as [number, number]),
    fitKey: `${expanded}-${scopeAll}`,
    expanded,
    onPinClick: (id: string) => setSelected({ id }),
    style: prefs.mapStyle,
    labels: prefs.mapLabels,
    transit: prefs.mapTransit,
    areas,
    selectedId: selected && 'id' in selected ? selected.id : null,
    onView,
    onPoiClick,
    onMapClick
  }
  const entry = selected && 'id' in selected ? (items.find((x) => x.id === selected.id) ?? null) : null
  const stopIndex = entry ? stops.findIndex((x) => x.id === entry.id) : -1
  // A pin's card closes if its entry leaves the map (another day picked, ideas hidden).
  useEffect(() => {
    if (selected && 'id' in selected && !pins.some((p) => p.id === selected.id)) setSelected(null)
  }, [pins.map((p) => p.id).join(), selected])

  return (
    <section aria-label="Map" style={width && !overlay && !full ? { flexBasis: width } : undefined} className={`pane pane-map${overlay ? ' is-expanded' : ''}${full ? ' is-full' : ''}`}>
      {/* No heading: just the full-screen button (the phone's Map tab is already full screen). */}
      {!full && (
        <div className="pane-head map-head">
          <span className="spacer" />
          <button className="icon-btn map-expand" aria-label={overlay ? 'Close full-screen map' : 'Full-screen map'} onClick={() => setExpanded((v) => !v)}>
            <Icon name={overlay ? 'close' : 'expand'} size={18} />
          </button>
        </div>
      )}
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
                {dayStyle(d).color && <span className="dot" style={{ background: dayStyle(d).color! }} />}
                <span className="small">Day {i + 1}</span> {dl.dow} {dl.num}
                {dayStyle(d).title && <span className="small"> · {dayStyle(d).title}</span>}
              </button>
            )
          })}
        </div>
      )}
      <div className="map-box">
        <Suspense fallback={<div className="map map-loading">Loading map…</div>}>
          {useGoogle ? (
            <MapCrashGuard fallback={<LeafletView {...view} />}>
              <GoogleView {...view} />
            </MapCrashGuard>
          ) : (
            <LeafletView {...view} />
          )}
        </Suspense>
        <MapLayers open={layersOpen} onToggle={() => setLayersOpen((v) => !v)} prefs={prefs} onPrefs={onPrefs} googleOk={googleOk} areasState={prefs.mapAreas ? areasState : 'idle'} />
        {selected ? (
          <PlaceCard
            entry={entry}
            placeId={entry ? entry.placeId || null : 'placeId' in selected ? selected.placeId : null}
            days={days}
            position={
              stopIndex >= 0
                ? { index: stopIndex, total: stops.length, onPrev: () => setSelected({ id: stops[stopIndex - 1].id }), onNext: () => setSelected({ id: stops[stopIndex + 1].id }) }
                : undefined
            }
            onOpen={onOpen}
            onSave={onSavePlace}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="map-actions">
            <button className="map-btn" aria-pressed={showIdeas} onClick={() => setShowIdeas((v) => !v)}>
              {showIdeas ? 'Hide unplanned ideas' : 'Show unplanned ideas'}
            </button>
          </div>
        )}
        {expanded && (
          <div className="map-legend">
            <ul>
              {tags
                .filter((t) => t.color && pins.some((p) => itemStyle(items.find((x) => x.id === p.id)!).name === t.name))
                .map((s) => (
                  <li key={s.name}>
                    <span className="legend-pin" style={{ background: s.color!, color: s.fg }}>
                      <LabelIconView name={s.icon} size={12} />
                    </span>
                    {s.name}
                  </li>
                ))}
            </ul>
            {!tags.some((t) => t.color) && <p className="muted small">Give tags a colour in Manage tags to colour the pins.</p>}
            {scopeAll && <p className="muted small">Numbers show the day.</p>}
          </div>
        )}
      </div>
    </section>
  )
}

const STYLES: { value: MapStyle; label: string; hint: string }[] = [
  { value: 'detailed', label: 'Detailed', hint: 'Every shop and station' },
  { value: 'simple', label: 'Simple', hint: 'Quiet, so your pins stand out' },
  { value: 'satellite', label: 'Satellite', hint: 'Aerial photos' }
]

/** The Layers button and panel: map style, what's drawn on the pins, and overlays. */
function MapLayers({ open, onToggle, prefs, onPrefs, googleOk, areasState }: { open: boolean; onToggle: () => void; prefs: Props['prefs']; onPrefs: Props['onPrefs']; googleOk: boolean; areasState: 'idle' | 'busy' | 'error' | 'zoom' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onToggle()
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, onToggle])
  const check = (key: 'mapLabels' | 'mapRoute' | 'mapAreas' | 'mapTransit', label: string, hint?: string) => (
    <label className="menu-item menu-check-item">
      <input type="checkbox" checked={prefs[key]} onChange={(e) => onPrefs({ [key]: e.target.checked })} />
      <span>
        {label}
        {hint && <span className="muted small layers-hint">{hint}</span>}
      </span>
    </label>
  )
  return (
    <div className="map-layers" ref={ref}>
      <button type="button" className={`map-layers-btn${open ? ' is-on' : ''}`} aria-expanded={open} aria-label="Map style and layers" title="Map style and layers" onClick={onToggle}>
        <Icon name="layers" size={18} />
        {areasState === 'busy' && <span className="layers-busy" aria-label="Loading neighbourhoods" />}
      </button>
      {open && (
        <div className="menu map-layers-menu" role="dialog" aria-label="Map style and layers">
          <p className="menu-head">Map style</p>
          <div className="layers-styles" role="group" aria-label="Map style">
            {STYLES.map((s) => (
              <button key={s.value} type="button" className={`layers-style style-${s.value}${prefs.mapStyle === s.value ? ' is-on' : ''}`} aria-pressed={prefs.mapStyle === s.value} onClick={() => onPrefs({ mapStyle: s.value })}>
                <span className="layers-thumb" aria-hidden="true" />
                <b>{s.label}</b>
                <span className="muted small">{s.hint}</span>
              </button>
            ))}
          </div>
          {prefs.mapStyle === 'simple' && googleOk && <p className="menu-hint">Simple is a plain map rather than Google’s, so Google’s own places (shops, cafés) can’t be tapped on it.</p>}
          <p className="menu-head">On the map</p>
          {check('mapLabels', 'Names beside pins')}
          {check('mapRoute', 'Route line through the day')}
          <p className="menu-head">Overlays</p>
          {check('mapAreas', 'Neighbourhoods', areasState === 'zoom' ? 'Zoom in to see them' : areasState === 'error' ? 'Couldn’t load them just now' : 'Ward and neighbourhood borders, from OpenStreetMap')}
          {check('mapTransit', 'Train and metro lines')}
        </div>
      )}
    </div>
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

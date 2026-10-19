import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { dayLabel, itemsForDay } from '../lib'
import { TYPE_COLORS, type Item } from '../types'
import { Icon } from './Icon'

interface Props {
  items: Item[]
  days: string[]
  selectedDay: string
  onSelectDay: (day: string) => void
  onOpen: (item: Item) => void
}

type Located = Item & { lat: number; lng: number }
const located = (x: Item): x is Located => x.lat != null && x.lng != null

function pinIcon(label: string | number, color: string) {
  return L.divIcon({
    className: '',
    html: `<span class="map-pin" style="background:${color}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })
}

const ideaIcon = L.divIcon({ className: '', html: '<span class="map-pin map-pin-idea"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })

function FitTo({ points, trigger }: { points: [number, number][]; trigger: string }) {
  const map = useMap()
  const key = trigger + points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 15 })
  }, [key, map])
  return null
}

/** Leaflet needs telling when its box changes size (e.g. going full screen). */
function TrackSize() {
  const map = useMap()
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  return null
}

export function MapPane({ items, days, selectedDay, onSelectDay, onOpen }: Props) {
  const [showIdeas, setShowIdeas] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [allDays, setAllDays] = useState(false)

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
  const points = [...stops, ...ideas].map((x) => [x.lat, x.lng] as [number, number])
  const l = dayLabel(selectedDay)

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
        <MapContainer center={[35.68, 139.76]} zoom={12} className="map" zoomControl={expanded}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!scopeAll && stops.length > 1 && (
            <Polyline positions={stops.map((x) => [x.lat, x.lng] as [number, number])} pathOptions={{ color: '#0E6B60', weight: 3, dashArray: '2 8' }} />
          )}
          {stops.map((x, i) => (
            <Marker
              key={x.id}
              position={[x.lat, x.lng]}
              icon={pinIcon(scopeAll ? days.indexOf(x.day!) + 1 : i + 1, TYPE_COLORS[x.type].fg)}
              title={scopeAll ? `Day ${days.indexOf(x.day!) + 1}: ${x.title}` : x.title}
              eventHandlers={{ click: () => onOpen(x) }}
            />
          ))}
          {ideas.map((x) => (
            <Marker key={x.id} position={[x.lat, x.lng]} icon={ideaIcon} title={x.title} eventHandlers={{ click: () => onOpen(x) }} />
          ))}
          <FitTo points={points} trigger={`${expanded}-${scopeAll}`} />
          <TrackSize />
        </MapContainer>
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

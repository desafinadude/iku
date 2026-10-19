import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { byTime, dayLabel } from '../lib'
import { TYPE_COLORS, type Item } from '../types'

interface Props {
  items: Item[]
  selectedDay: string
  onOpen: (item: Item) => void
}

type Located = Item & { lat: number; lng: number }
const located = (x: Item): x is Located => x.lat != null && x.lng != null

function planIcon(n: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<span class="map-pin" style="background:${color}">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })
}

const ideaIcon = L.divIcon({ className: '', html: '<span class="map-pin map-pin-idea"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })

function FitTo({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
  }, [key, map])
  return null
}

export function MapPane({ items, selectedDay, onOpen }: Props) {
  const [showIdeas, setShowIdeas] = useState(false)
  const stops = useMemo(() => items.filter((x) => x.day === selectedDay).sort(byTime).filter(located), [items, selectedDay])
  const ideas = useMemo(() => (showIdeas ? items.filter((x) => !x.day).filter(located) : []), [items, showIdeas])
  const points = [...stops, ...ideas].map((x) => [x.lat, x.lng] as [number, number])
  const l = dayLabel(selectedDay)

  return (
    <section aria-label="Map" className="pane pane-map">
      <div className="pane-head">
        <h2>Map</h2>
        <span className="muted">
          {l.dow} {l.num} {l.month}
        </span>
      </div>
      <div className="map-box">
        <MapContainer center={[35.68, 139.76]} zoom={12} className="map" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stops.length > 1 && (
            <Polyline positions={stops.map((x) => [x.lat, x.lng] as [number, number])} pathOptions={{ color: '#0E6B60', weight: 3, dashArray: '2 8' }} />
          )}
          {stops.map((x, i) => (
            <Marker key={x.id} position={[x.lat, x.lng]} icon={planIcon(i + 1, TYPE_COLORS[x.type].fg)} title={x.title} eventHandlers={{ click: () => onOpen(x) }} />
          ))}
          {ideas.map((x) => (
            <Marker key={x.id} position={[x.lat, x.lng]} icon={ideaIcon} title={x.title} eventHandlers={{ click: () => onOpen(x) }} />
          ))}
          <FitTo points={points} />
        </MapContainer>
        <div className="map-actions">
          <button className="map-btn" aria-pressed={showIdeas} onClick={() => setShowIdeas((v) => !v)}>
            {showIdeas ? 'Hide unplanned ideas' : 'Show unplanned ideas'}
          </button>
        </div>
      </div>
    </section>
  )
}

import L from 'leaflet'
import { inkColor } from '../colors'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { iconHtml } from '../labels/icons'
import type { MapPin, MapViewProps } from './types'

function icon(pin: MapPin) {
  return pin.idea
    ? L.divIcon({ className: '', html: `<span class="map-pin map-pin-idea" style="border-color:${inkColor(pin.color)};color:${inkColor(pin.color)}">${iconHtml(pin.icon, 14, 'currentColor')}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] })
    : L.divIcon({
        className: '',
        html: `<span class="map-pin" style="background:${pin.color}">${iconHtml(pin.icon, 18, pin.fg)}${pin.label ? `<b class="pin-num">${pin.label}</b>` : ''}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
}

function FitTo({ points, fitKey }: { points: [number, number][]; fitKey: string }) {
  const map = useMap()
  const key = fitKey + points.map((p) => p.join(',')).join('|')
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

export function LeafletView({ pins, route, fitKey, expanded, onPinClick }: MapViewProps) {
  return (
    <MapContainer center={[35.68, 139.76]} zoom={12} className="map" zoomControl={expanded}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#0E6B60', weight: 3, dashArray: '2 8' }} />}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p)} title={p.title} eventHandlers={{ click: () => onPinClick(p.id) }} />
      ))}
      <FitTo points={pins.map((p) => [p.lat, p.lng])} fitKey={fitKey} />
      <TrackSize />
    </MapContainer>
  )
}

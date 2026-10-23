import L from 'leaflet'
import { inkColor } from '../colors'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import { iconHtml } from '../labels/icons'
import type { MapPin, MapStyle, MapViewProps } from './types'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function icon(pin: MapPin, label: boolean, selected: boolean) {
  const name = label ? `<span class="pin-label">${esc(pin.title)}</span>` : ''
  const cls = selected ? ' is-selected' : ''
  return pin.idea
    ? L.divIcon({ className: '', html: `<span class="map-pin map-pin-idea${cls}" style="border-color:${inkColor(pin.color)};color:${inkColor(pin.color)}">${iconHtml(pin.icon, 14, 'currentColor')}${name}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] })
    : L.divIcon({
        className: '',
        html: `<span class="map-pin${cls}" style="background:${pin.color}">${iconHtml(pin.icon, 18, pin.fg)}${pin.label ? `<b class="pin-num">${pin.label}</b>` : ''}${name}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
/** Base maps that need no key: OpenStreetMap, Esri's light grey canvas (quiet, so pins stand out) and Esri imagery. */
const TILES: Record<MapStyle, { url: string; attribution: string; labels?: string }> = {
  detailed: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
  simple: { url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, labels: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' },
  satellite: { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }
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

function TrackView({ onView, onMapClick }: Pick<MapViewProps, 'onView' | 'onMapClick'>) {
  const report = (map: L.Map) => {
    const b = map.getBounds()
    onView([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()], map.getZoom())
  }
  const map = useMapEvents({ moveend: () => report(map), click: () => onMapClick?.() })
  useEffect(() => {
    map.whenReady(() => report(map))
  }, [map])
  return null
}

export function LeafletView({ pins, route, fitKey, expanded, onPinClick, style, labels, transit, areas, selectedId, onView, onMapClick }: MapViewProps) {
  const tiles = TILES[style]
  return (
    <MapContainer center={[35.68, 139.76]} zoom={12} className={`map map-${style}`} zoomControl={false}>
      {/* Bottom right, clear of the place card (left) and the layers button (top right). */}
      {expanded && <ZoomControl position="bottomright" />}
      <TileLayer key={style} attribution={tiles.attribution} url={tiles.url} maxNativeZoom={style === 'detailed' ? 19 : 16} maxZoom={19} />
      {tiles.labels && <TileLayer key={style + '-labels'} url={tiles.labels} maxNativeZoom={16} maxZoom={19} pane="overlayPane" />}
      {transit && <TileLayer url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>' opacity={0.8} />}
      {areas?.lines.map((l, i) => (
        <Polyline key={i} positions={l.path} interactive={false} pathOptions={{ color: style === 'satellite' ? '#fff' : '#6d3fc0', weight: l.level <= 8 ? 2.5 : 1.5, opacity: 0.75, dashArray: l.level <= 8 ? undefined : '4 4' }} />
      ))}
      {areas?.labels.map((a) => (
        <Marker key={`${a.name}${a.lat}`} position={[a.lat, a.lng]} interactive={false} keyboard={false} icon={L.divIcon({ className: '', html: `<span class="area-label lvl-${a.level <= 8 ? 'big' : 'small'}">${esc(a.name)}</span>`, iconSize: [0, 0] })} />
      ))}
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: style === 'satellite' ? '#fde047' : '#0E6B60', weight: 3, dashArray: '2 8' }} />}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p, labels, p.id === selectedId)} zIndexOffset={p.id === selectedId ? 1000 : 0} title={p.title} eventHandlers={{ click: () => onPinClick(p.id) }} />
      ))}
      <FitTo points={pins.map((p) => [p.lat, p.lng])} fitKey={fitKey} />
      <TrackSize />
      <TrackView onView={onView} onMapClick={onMapClick} />
    </MapContainer>
  )
}

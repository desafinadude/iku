import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'
import { useEffect } from 'react'
import { LabelIconView } from '../labels/LabelIconView'
import { GOOGLE_MAP_ID } from './config'
import type { MapViewProps } from './types'

function Route({ route }: { route: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!map || route.length < 2) return
    const line = new google.maps.Polyline({
      map,
      path: route.map(([lat, lng]) => ({ lat, lng })),
      strokeOpacity: 0,
      // A dotted line, drawn as repeated circles.
      icons: [{ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2, fillColor: '#0E6B60', fillOpacity: 1, strokeOpacity: 0 }, offset: '0', repeat: '10px' }]
    })
    return () => line.setMap(null)
  }, [map, route])
  return null
}

function FitTo({ points, fitKey }: { points: { lat: number; lng: number }[]; fitKey: string }) {
  const map = useMap()
  const key = fitKey + points.map((p) => `${p.lat},${p.lng}`).join('|')
  useEffect(() => {
    if (!map || !points.length) return
    if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(14)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    points.forEach((p) => bounds.extend(p))
    map.fitBounds(bounds, 48)
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15)
    })
  }, [key, map])
  return null
}

export function GoogleView({ pins, route, fitKey, expanded, onPinClick }: MapViewProps) {
  return (
    <Map
      className="map"
      mapId={GOOGLE_MAP_ID}
      defaultCenter={{ lat: 35.68, lng: 139.76 }}
      defaultZoom={12}
      gestureHandling={expanded ? 'greedy' : 'cooperative'}
      disableDefaultUI={!expanded}
      clickableIcons
    >
      <Route route={route} />
      {pins.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.title} onClick={() => onPinClick(p.id)}>
          {p.idea ? (
            <span className="map-pin map-pin-idea" style={{ borderColor: p.color, color: p.color }}>
              <LabelIconView name={p.icon} size={12} />
            </span>
          ) : (
            <span className="map-pin" style={{ background: p.color, color: '#fff' }}>
              <LabelIconView name={p.icon} size={16} />
              {p.label && <b className="pin-num">{p.label}</b>}
            </span>
          )}
        </AdvancedMarker>
      ))}
      <FitTo points={pins} fitKey={fitKey} />
    </Map>
  )
}

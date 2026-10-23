import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'
import { inkColor } from '../colors'
import { useEffect } from 'react'
import { LabelIconView } from '../labels/LabelIconView'
import { GOOGLE_MAP_ID } from './config'
import type { Areas, MapViewProps } from './types'

function Route({ route, light }: { route: [number, number][]; light: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map || route.length < 2) return
    const line = new google.maps.Polyline({
      map,
      path: route.map(([lat, lng]) => ({ lat, lng })),
      strokeOpacity: 0,
      // A dotted line, drawn as repeated circles.
      icons: [{ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2, fillColor: light ? '#fde047' : '#0E6B60', fillOpacity: 1, strokeOpacity: 0 }, offset: '0', repeat: '10px' }]
    })
    return () => line.setMap(null)
  }, [map, route, light])
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

/** Reports the visible area when the map settles; a tap on one of Google's own places opens our card instead of Google's. */
function TrackView({ onView, onPoiClick, onMapClick }: Pick<MapViewProps, 'onView' | 'onPoiClick' | 'onMapClick'>) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const idle = map.addListener('idle', () => {
      const b = map.getBounds()
      if (b) onView([b.getSouthWest().lat(), b.getSouthWest().lng(), b.getNorthEast().lat(), b.getNorthEast().lng()], map.getZoom() ?? 12)
    })
    const click = map.addListener('click', (e: google.maps.MapMouseEvent & { placeId?: string; stop?: () => void }) => {
      if (e.placeId && onPoiClick) {
        e.stop?.()
        onPoiClick(e.placeId)
      } else onMapClick?.()
    })
    return () => {
      idle.remove()
      click.remove()
    }
  }, [map, onView, onPoiClick, onMapClick])
  return null
}

function Transit({ on }: { on: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !on) return
    const layer = new google.maps.TransitLayer()
    layer.setMap(map)
    return () => layer.setMap(null)
  }, [map, on])
  return null
}

function AreaLines({ areas, light }: { areas: Areas | null; light: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !areas) return
    const lines = areas.lines.map(
      (l) =>
        new google.maps.Polyline({
          map,
          path: l.path.map(([lat, lng]) => ({ lat, lng })),
          clickable: false,
          strokeColor: light ? '#ffffff' : '#6d3fc0',
          strokeOpacity: l.level <= 8 ? 0.75 : 0,
          strokeWeight: l.level <= 8 ? 2.5 : 1.5,
          // Smaller areas get a dashed line.
          icons: l.level <= 8 ? undefined : [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, strokeColor: light ? '#ffffff' : '#6d3fc0', scale: 1.5 }, offset: '0', repeat: '8px' }]
        })
    )
    return () => lines.forEach((l) => l.setMap(null))
  }, [map, areas, light])
  return null
}

export function GoogleView({ pins, route, fitKey, expanded, onPinClick, style, labels, transit, areas, selectedId, onView, onPoiClick, onMapClick }: MapViewProps) {
  return (
    <Map
      className="map"
      mapId={GOOGLE_MAP_ID}
      mapTypeId={style === 'satellite' ? 'hybrid' : 'roadmap'}
      mapTypeControl={false}
      defaultCenter={{ lat: 35.68, lng: 139.76 }}
      defaultZoom={12}
      gestureHandling={expanded ? 'greedy' : 'cooperative'}
      disableDefaultUI={!expanded}
      // The legend sits top-right, and the app has its own full-screen control.
      fullscreenControl={false}
      clickableIcons
    >
      <Route route={route} light={style === 'satellite'} />
      <Transit on={transit} />
      <AreaLines areas={areas} light={style === 'satellite'} />
      {areas?.labels.map((a) => (
        <AdvancedMarker key={`${a.name}${a.lat}`} position={{ lat: a.lat, lng: a.lng }} clickable={false} zIndex={-1}>
          <span className={`area-label lvl-${a.level <= 8 ? 'big' : 'small'}`}>{a.name}</span>
        </AdvancedMarker>
      ))}
      {pins.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.title} zIndex={p.id === selectedId ? 1000 : undefined} onClick={() => onPinClick(p.id)}>
          <span className={`map-pin${p.idea ? ' map-pin-idea' : ''}${p.id === selectedId ? ' is-selected' : ''}`} style={{ background: p.color, color: p.fg, ['--ring' as string]: inkColor(p.color) }}>
            <LabelIconView name={p.icon} size={20} />
            {p.label && <b className="pin-num">{p.label}</b>}
            {p.extras.length > 0 && (
              <span className="pin-extras">
                {p.extras.map((x, i) => (
                  <span key={i} className="pin-extra" style={{ background: x.color, color: x.fg }}>
                    <LabelIconView name={x.icon} size={11} />
                  </span>
                ))}
              </span>
            )}
            {labels && <span className="pin-label">{p.title}</span>}
          </span>
        </AdvancedMarker>
      ))}
      <TrackView onView={onView} onPoiClick={onPoiClick} onMapClick={onMapClick} />
      <FitTo points={pins} fitKey={fitKey} />
    </Map>
  )
}

export interface MapPin {
  id: string
  lat: number
  lng: number
  /** Number or short text on the pin; empty for unplanned ideas. */
  label: string
  color: string
  /** Icon colour on the pin. */
  fg: string
  /** Label icon name drawn in the pin. */
  icon: string
  /** The entry's other coloured tags, as small badges on the same pin (the pin is the same whatever the filter). */
  extras: { color: string; fg: string; icon: string }[]
  idea: boolean
  title: string
}

export type MapStyle = 'detailed' | 'simple' | 'satellite'

/** The visible area, as south, west, north, east. */
export type Bounds = [number, number, number, number]

/** Neighbourhood (and ward) boundaries to draw: lines, plus a name for each area. */
export interface Areas {
  lines: { level: number; path: [number, number][] }[]
  labels: { name: string; lat: number; lng: number; level: number }[]
}

/** What both map renderers (Google and OpenStreetMap) take. */
export interface MapViewProps {
  style: MapStyle
  /** The entry's name beside each pin. */
  labels: boolean
  transit: boolean
  areas: Areas | null
  /** The pin whose card is open (drawn on top, a little bigger). */
  selectedId: string | null
  /** Reports the visible area after the map stops moving. */
  onView: (bounds: Bounds, zoom: number) => void
  /** A tap on one of the map's own places (Google only). */
  onPoiClick?: (placeId: string) => void
  /** A tap on empty map. */
  onMapClick?: () => void
  pins: MapPin[]
  /** Dotted line through the day's stops, in order. */
  route: [number, number][]
  /** Changes when the map should re-fit to its pins. */
  fitKey: string
  expanded: boolean
  onPinClick: (id: string) => void
}

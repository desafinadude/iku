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
  idea: boolean
  title: string
}

/** What both map renderers (Google and OpenStreetMap) take. */
export interface MapViewProps {
  pins: MapPin[]
  /** Dotted line through the day's stops, in order. */
  route: [number, number][]
  /** Changes when the map should re-fit to its pins. */
  fitKey: string
  expanded: boolean
  onPinClick: (id: string) => void
}

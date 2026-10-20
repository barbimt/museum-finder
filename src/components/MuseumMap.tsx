import { lazy, Suspense } from 'react'
import type { Coordinates } from '../types/museum'

const LeafletMap = lazy(() => import('./LeafletMap'))

type MuseumMapProps = {
  name: string
  coordinates: Coordinates
}

const MAP_ZOOM = 16

const formatCoordinates = ({ latitude, longitude }: Coordinates): string =>
  `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}, ` +
  `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`

const openStreetMapUrl = ({ latitude, longitude }: Coordinates): string => {
  const params = new URLSearchParams({
    mlat: String(latitude),
    mlon: String(longitude),
  })

  return `https://www.openstreetmap.org/?${params}#map=${MAP_ZOOM}/${latitude}/${longitude}`
}

const MuseumMap = ({ name, coordinates }: MuseumMapProps) => (
  <figure
    className="museum-map"
    aria-label={`Map showing the location of ${name}`}
  >
    <p className="museum-details__label" aria-hidden="true">
      Location
    </p>
    <div className="museum-map__frame">
      <Suspense fallback={<p className="museum-map__loading">Loading map…</p>}>
        <LeafletMap coordinates={coordinates} />
      </Suspense>
    </div>
    <figcaption className="museum-map__caption">
      <span>{formatCoordinates(coordinates)}</span>
      <a
        className="museum-map__open"
        href={openStreetMapUrl(coordinates)}
        target="_blank"
        rel="noreferrer"
      >
        Open in OpenStreetMap
      </a>
    </figcaption>
  </figure>
)

export default MuseumMap

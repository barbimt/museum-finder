import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import type { Coordinates } from '../types/museum'

const MAP_ZOOM = 16

type LeafletMapProps = {
  coordinates: Coordinates
}

const LeafletMap = ({ coordinates }: LeafletMapProps) => {
  const center: [number, number] = [coordinates.latitude, coordinates.longitude]

  return (
    <MapContainer
      className="museum-map__map"
      center={center}
      zoom={MAP_ZOOM}
      dragging={false}
      touchZoom={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <CircleMarker
        center={center}
        radius={8}
        interactive={false}
        pathOptions={{ className: 'museum-map__marker' }}
      />
    </MapContainer>
  )
}

export default LeafletMap

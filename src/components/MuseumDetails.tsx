import { MapPin } from 'lucide-react'
import type { Museum } from '../types/museum'
import MuseumMap from './MuseumMap'

type MuseumDetailsProps = {
  museum: Museum
}

const MuseumDetails = ({ museum }: MuseumDetailsProps) => {
  const { address } = museum

  return (
    <section
      className="museum-details"
      aria-labelledby="museum-details-heading"
    >
      <h3 id="museum-details-heading" className="museum-details__name">
        {museum.name}
      </h3>
      <p className="museum-details__label">Full address</p>
      {address ? (
        <address className="museum-details__address">
          <MapPin className="museum-details__pin" size={20} strokeWidth={1.8} />
          <span className="museum-details__lines">
            <span className="museum-details__street">{address.street}</span>
            {address.summary && (
              <span className="museum-details__summary">{address.summary}</span>
            )}
          </span>
        </address>
      ) : (
        <p className="museum-details__address">Address not available</p>
      )}
      {museum.coordinates && (
        <MuseumMap
          key={museum.id}
          name={museum.name}
          coordinates={museum.coordinates}
        />
      )}
    </section>
  )
}

export default MuseumDetails

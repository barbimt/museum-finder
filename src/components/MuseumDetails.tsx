import { Fragment } from 'react'
import type { Museum } from '../types/museum'

type MuseumDetailsProps = {
  museum: Museum
}

const MuseumDetails = ({ museum }: MuseumDetailsProps) => (
  <section className="museum-details" aria-labelledby="museum-details-heading">
    <h2 id="museum-details-heading">{museum.name}</h2>
    {museum.addressLines.length > 0 ? (
      <address className="museum-details__address">
        {museum.addressLines.map((line, index) => (
          <Fragment key={line}>
            {index > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </address>
    ) : (
      <p>Address not available</p>
    )}
  </section>
)

export default MuseumDetails

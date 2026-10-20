import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Museum } from '../types/museum'
import MuseumDetails from './MuseumDetails'

const tateModern: Museum = {
  id: 'W1',
  name: 'Tate Modern',
  location: 'London, United Kingdom',
  address: {
    street: '53 Bankside',
    summary: 'SE1 9TG London · United Kingdom',
  },
  coordinates: { latitude: 51.5076, longitude: -0.0994 },
}

describe('MuseumDetails', () => {
  it('shows the address and an attributed location map when coordinates are available', async () => {
    render(<MuseumDetails museum={tateModern} />)

    const details = screen.getByRole('region', { name: 'Tate Modern' })
    const address = details.querySelector('address')
    expect(address).toHaveTextContent('53 Bankside')
    expect(address).toHaveTextContent('SE1 9TG London · United Kingdom')

    const map = screen.getByRole('figure', {
      name: 'Map showing the location of Tate Modern',
    })
    expect(map).toHaveTextContent('51.5076° N, 0.0994° W')
    expect(
      await within(map).findByRole('link', {
        name: (name) => name === 'OpenStreetMap',
      }),
    ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    expect(
      within(map).getByRole('link', { name: 'Open in OpenStreetMap' }),
    ).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/?mlat=51.5076&mlon=-0.0994#map=16/51.5076/-0.0994',
    )
  })

  it('omits the map when the museum has no valid coordinates', () => {
    render(<MuseumDetails museum={{ ...tateModern, coordinates: undefined }} />)

    expect(screen.getByText(/53 Bankside/)).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('shows a fallback when the address is missing', () => {
    render(<MuseumDetails museum={{ ...tateModern, address: undefined }} />)

    const details = screen.getByRole('region', { name: 'Tate Modern' })
    expect(details).toHaveTextContent('Address not available')
    expect(details.querySelector('address')).not.toBeInTheDocument()
  })
})

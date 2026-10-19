import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPhotonFeature,
  photonResponse,
  tateModernFeature,
} from '../test/photonFixtures'
import { fetchPhotonMuseums } from './photon'

const mockFetch = () => vi.spyOn(globalThis, 'fetch')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchPhotonMuseums', () => {
  it('requests museums from Photon with the expected parameters and signal', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(photonResponse([]))
    const controller = new AbortController()

    await fetchPhotonMuseums('tate modern', controller.signal)

    const [url, init] = fetchSpy.mock.calls[0]
    const requestUrl = new URL(String(url))
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      'https://photon.komoot.io/api/',
    )
    expect(requestUrl.searchParams.get('q')).toBe('tate modern')
    expect(requestUrl.searchParams.get('osm_tag')).toBe('tourism:museum')
    expect(requestUrl.searchParams.get('limit')).toBe('10')
    expect(init?.signal).toBe(controller.signal)
  })

  it('maps a full address into ordered address lines', async () => {
    mockFetch().mockResolvedValue(photonResponse([tateModernFeature]))

    const [museum] = await fetchPhotonMuseums('tate')

    expect(museum).toEqual({
      id: 'W1',
      name: 'Tate Modern',
      location: 'London, United Kingdom',
      addressLines: ['53 Bankside', 'London', 'SE1 9TG', 'United Kingdom'],
    })
  })

  it('skips missing address parts and removes duplicate values', async () => {
    mockFetch().mockResolvedValue(
      photonResponse([
        createPhotonFeature({
          osm_id: 10,
          name: 'Musée Art & Histoire',
          street: 'Avenue des Nerviens',
          district: 'Bruxelles',
          city: 'Bruxelles',
          postcode: '1000',
          country: 'Belgique',
        }),
      ]),
    )

    const [museum] = await fetchPhotonMuseums('art')

    expect(museum.addressLines).toEqual([
      'Avenue des Nerviens',
      'Bruxelles',
      '1000',
      'Belgique',
    ])
  })

  it('falls back to a placeholder name and an empty address', async () => {
    mockFetch().mockResolvedValue(
      photonResponse([createPhotonFeature({ osm_id: 11 })]),
    )

    const [museum] = await fetchPhotonMuseums('museum')

    expect(museum).toEqual({
      id: 'N11',
      name: 'Unnamed museum',
      location: '',
      addressLines: [],
    })
  })

  it('throws when Photon responds with an unsuccessful status', async () => {
    mockFetch().mockResolvedValue(new Response('Unavailable', { status: 503 }))

    await expect(fetchPhotonMuseums('tate')).rejects.toThrow(
      'Photon request failed with status 503',
    )
  })

  it('throws when the response is not a feature collection', async () => {
    mockFetch().mockResolvedValue(
      new Response(JSON.stringify({ message: 'nope' }), { status: 200 }),
    )

    await expect(fetchPhotonMuseums('tate')).rejects.toThrow(
      'Photon returned an unexpected response',
    )
  })
})

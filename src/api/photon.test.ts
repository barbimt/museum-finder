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
    expect(requestUrl.searchParams.get('limit')).toBe('50')
    expect(init?.signal).toBe(controller.signal)
  })

  it('maps a full address into ordered address lines', async () => {
    mockFetch().mockResolvedValue(photonResponse([tateModernFeature]))

    const [museum] = await fetchPhotonMuseums('tate')

    expect(museum).toEqual({
      id: 'W1',
      name: 'Tate Modern',
      location: 'London, United Kingdom',
      address: {
        street: '53 Bankside',
        summary: 'SE1 9TG London · United Kingdom',
      },
      coordinates: { latitude: 51.5076, longitude: -0.0994 },
    })
  })

  it('maps GeoJSON [longitude, latitude] coordinates in the right order', async () => {
    mockFetch().mockResolvedValue(
      photonResponse([
        createPhotonFeature({ osm_id: 12 }, [-73.9776, 40.7614]),
      ]),
    )

    const [museum] = await fetchPhotonMuseums('moma')

    expect(museum.coordinates).toEqual({
      latitude: 40.7614,
      longitude: -73.9776,
    })
  })

  it.each([
    ['missing', undefined],
    ['not an array', '51.5,-0.1'],
    ['too short', [-0.1]],
    ['not numbers', ['-0.1', '51.5']],
    ['null', [null, 51.5]],
    ['latitude out of range', [-0.1, 91]],
    ['longitude out of range', [181, 51.5]],
  ])('omits coordinates that are %s', async (_case, coordinates) => {
    mockFetch().mockResolvedValue(
      photonResponse([createPhotonFeature({ osm_id: 13 }, coordinates)]),
    )

    const [museum] = await fetchPhotonMuseums('museum')

    expect(museum).not.toHaveProperty('coordinates')
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

    expect(museum.address).toEqual({
      street: 'Avenue des Nerviens',
      summary: '1000 Bruxelles · Belgique',
    })
  })

  it('groups a full address into a street line and a locality summary', async () => {
    mockFetch().mockResolvedValue(
      photonResponse([
        createPhotonFeature({
          osm_id: 14,
          street: 'Via Amerigo Vespucci',
          locality: 'Fontanini',
          city: 'Viareggio',
          county: 'Lucca',
          state: 'Tuscany',
          postcode: '55043',
          country: 'Italy',
        }),
      ]),
    )

    const [museum] = await fetchPhotonMuseums('viareggio')

    expect(museum.address).toEqual({
      street: 'Via Amerigo Vespucci',
      summary: '55043 Viareggio · Italy',
    })
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

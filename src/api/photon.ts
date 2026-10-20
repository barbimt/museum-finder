import type { Coordinates, Museum, MuseumAddress } from '../types/museum'

const PHOTON_API_URL = 'https://photon.komoot.io/api/'
// The public Photon server returns at most 50 results and has no further pages.
const MUSEUM_RESULT_LIMIT = '50'
const UNNAMED_MUSEUM = 'Unnamed museum'

type PhotonProperties = {
  osm_type: string
  osm_id: number
  name?: string
  housenumber?: string
  street?: string
  locality?: string
  district?: string
  city?: string
  county?: string
  state?: string
  postcode?: string
  country?: string
}

type PhotonFeature = {
  type: 'Feature'
  properties: PhotonProperties
  geometry?: { coordinates?: unknown }
}

type PhotonFeatureCollection = {
  type: 'FeatureCollection'
  features: PhotonFeature[]
}

const text = (value?: string): string | undefined => {
  const trimmed = value?.trim()
  return trimmed || undefined
}

const toAddress = (properties: PhotonProperties): MuseumAddress | undefined => {
  const street = [text(properties.housenumber), text(properties.street)]
    .filter(Boolean)
    .join(' ')
  const place =
    text(properties.city) ??
    text(properties.locality) ??
    text(properties.county) ??
    text(properties.state)
  const country = text(properties.country)
  const primary = street || place || country || ''

  const locality = [
    text(properties.postcode),
    place === primary ? undefined : place,
  ]
    .filter(Boolean)
    .join(' ')
  const summary = [
    locality,
    country && country !== primary ? country : undefined,
  ]
    .filter(Boolean)
    .join(' · ')

  return primary ? { street: primary, ...(summary && { summary }) } : undefined
}

const toLocation = (properties: PhotonProperties): string =>
  [properties.city ?? properties.state, properties.country]
    .filter(Boolean)
    .join(', ')

const isInRange = (value: unknown, limit: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit

// GeoJSON positions are ordered [longitude, latitude].
const toCoordinates = (position: unknown): Coordinates | undefined => {
  if (!Array.isArray(position)) return undefined
  const [longitude, latitude] = position
  return isInRange(latitude, 90) && isInRange(longitude, 180)
    ? { latitude, longitude }
    : undefined
}

const toMuseum = ({ properties, geometry }: PhotonFeature): Museum => {
  const address = toAddress(properties)
  const coordinates = toCoordinates(geometry?.coordinates)

  return {
    id: `${properties.osm_type}${properties.osm_id}`,
    name: properties.name?.trim() || UNNAMED_MUSEUM,
    location: toLocation(properties),
    ...(address && { address }),
    ...(coordinates && { coordinates }),
  }
}

const isFeatureCollection = (data: unknown): data is PhotonFeatureCollection =>
  typeof data === 'object' &&
  data !== null &&
  Array.isArray((data as { features?: unknown }).features)

export const fetchPhotonMuseums = async (
  query: string,
  signal?: AbortSignal,
): Promise<Museum[]> => {
  const params = new URLSearchParams({
    q: query,
    osm_tag: 'tourism:museum',
    limit: MUSEUM_RESULT_LIMIT,
  })

  const response = await fetch(`${PHOTON_API_URL}?${params}`, { signal })

  if (!response.ok) {
    throw new Error(`Photon request failed with status ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!isFeatureCollection(data)) {
    throw new Error('Photon returned an unexpected response')
  }

  return data.features.map(toMuseum)
}

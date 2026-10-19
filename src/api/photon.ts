import type { Museum } from '../types/museum'

const PHOTON_API_URL = 'https://photon.komoot.io/api/'
const MUSEUM_RESULT_LIMIT = '10'
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
}

type PhotonFeatureCollection = {
  type: 'FeatureCollection'
  features: PhotonFeature[]
}

const toAddressLines = (properties: PhotonProperties): string[] => {
  const streetLine = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(' ')

  const parts = [
    streetLine,
    properties.locality,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  return [...new Set(parts)]
}

const toLocation = (properties: PhotonProperties): string =>
  [properties.city ?? properties.state, properties.country]
    .filter(Boolean)
    .join(', ')

const toMuseum = ({ properties }: PhotonFeature): Museum => ({
  id: `${properties.osm_type}${properties.osm_id}`,
  name: properties.name?.trim() || UNNAMED_MUSEUM,
  location: toLocation(properties),
  addressLines: toAddressLines(properties),
})

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

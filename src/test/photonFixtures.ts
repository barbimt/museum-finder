type FeatureProperties = Record<string, string | number | undefined>

export const createPhotonFeature = (
  properties: FeatureProperties,
  coordinates?: unknown,
) => ({
  type: 'Feature',
  properties: {
    osm_type: 'N',
    osm_key: 'tourism',
    osm_value: 'museum',
    ...properties,
  },
  geometry: { type: 'Point', coordinates },
})

export const photonResponse = (
  features: ReturnType<typeof createPhotonFeature>[],
) =>
  new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

export const tateModernFeature = createPhotonFeature(
  {
    osm_type: 'W',
    osm_id: 1,
    name: 'Tate Modern',
    housenumber: '53',
    street: 'Bankside',
    city: 'London',
    postcode: 'SE1 9TG',
    country: 'United Kingdom',
  },
  [-0.0994, 51.5076],
)

export const tateBritainFeature = createPhotonFeature(
  {
    osm_type: 'W',
    osm_id: 2,
    name: 'Tate Britain',
    street: 'Millbank',
    city: 'London',
    country: 'United Kingdom',
  },
  [-0.1275, 51.491],
)

export const artGalleryFeature = createPhotonFeature({
  osm_type: 'N',
  osm_id: 3,
  name: 'Art Gallery of Alberta',
  city: 'Edmonton',
  country: 'Canada',
})

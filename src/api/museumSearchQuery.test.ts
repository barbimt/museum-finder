import { QueryClient } from '@tanstack/react-query'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'
import {
  artGalleryFeature,
  photonResponse,
  tateModernFeature,
} from '../test/photonFixtures'
import {
  MUSEUM_SEARCH_STALE_TIME_MS,
  isMuseumSearchFresh,
  museumSearchQueryOptions,
  normaliseQuery,
} from './museumSearchQuery'

const START_TIME = new Date('2026-01-01T10:00:00Z').getTime()

let queryClient: QueryClient

const searchMuseums = (input: string) =>
  queryClient.fetchQuery(museumSearchQueryOptions(normaliseQuery(input)))

const requestedQueries = (fetchSpy: MockInstance<typeof fetch>) =>
  fetchSpy.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('q'))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(START_TIME)
  queryClient = new QueryClient()
})

afterEach(() => {
  queryClient.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('normaliseQuery', () => {
  it('trims, collapses whitespace and lowercases the search term', () => {
    expect(normaliseQuery('  Tate   Modern ')).toBe('tate modern')
  })
})

describe('museum search cache', () => {
  it('reuses cached results just before five minutes and refetches at exactly five minutes', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => photonResponse([tateModernFeature]))

    await searchMuseums('tate')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    vi.setSystemTime(START_TIME + MUSEUM_SEARCH_STALE_TIME_MS - 1)
    await searchMuseums('tate')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    vi.setSystemTime(START_TIME + MUSEUM_SEARCH_STALE_TIME_MS)
    await searchMuseums('tate')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('reports freshness on both sides of the five-minute boundary', () => {
    vi.setSystemTime(START_TIME + MUSEUM_SEARCH_STALE_TIME_MS - 1)
    expect(isMuseumSearchFresh(START_TIME)).toBe(true)

    vi.setSystemTime(START_TIME + MUSEUM_SEARCH_STALE_TIME_MS)
    expect(isMuseumSearchFresh(START_TIME)).toBe(false)
  })

  it('shares one cache entry between equivalent search terms', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => photonResponse([tateModernFeature]))

    await searchMuseums('  Tate  Modern ')
    await searchMuseums('tate modern')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(requestedQueries(fetchSpy)).toEqual(['tate modern'])
  })

  it('caches different search terms independently', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        photonResponse(
          String(url).includes('q=tate')
            ? [tateModernFeature]
            : [artGalleryFeature],
        ),
      )

    const tateMuseums = await searchMuseums('tate')
    const artMuseums = await searchMuseums('art')
    await searchMuseums('tate')
    await searchMuseums('art')

    expect(tateMuseums[0].name).toBe('Tate Modern')
    expect(artMuseums[0].name).toBe('Art Gallery of Alberta')
    expect(requestedQueries(fetchSpy)).toEqual(['tate', 'art'])
  })

  it('caches empty results', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => photonResponse([]))

    expect(await searchMuseums('zzzz')).toEqual([])
    expect(await searchMuseums('zzzz')).toEqual([])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does not cache failed requests or retry them automatically', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockImplementation(async () => photonResponse([tateModernFeature]))

    await expect(searchMuseums('tate')).rejects.toThrow()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await expect(searchMuseums('tate')).resolves.toHaveLength(1)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('deduplicates concurrent requests for the same search term', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => photonResponse([tateModernFeature]))

    await Promise.all([searchMuseums('tate'), searchMuseums('Tate')])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

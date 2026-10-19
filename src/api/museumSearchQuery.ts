import { queryOptions } from '@tanstack/react-query'
import { fetchPhotonMuseums } from './photon'

export const MIN_QUERY_LENGTH = 3
export const SEARCH_DEBOUNCE_MS = 400
export const MUSEUM_SEARCH_STALE_TIME_MS = 5 * 60 * 1000
export const MUSEUM_SEARCH_GC_TIME_MS = 10 * 60 * 1000

export const normaliseQuery = (query: string): string =>
  query.trim().replace(/\s+/g, ' ').toLowerCase()

export const museumSearchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ['museums', query],
    queryFn: ({ signal }) => fetchPhotonMuseums(query, signal),
    staleTime: MUSEUM_SEARCH_STALE_TIME_MS,
    // Must be at least staleTime so fresh results survive while another term is shown.
    gcTime: MUSEUM_SEARCH_GC_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  })

// Disabled queries always report `isStale: false`, so freshness is derived from the update time.
export const isMuseumSearchFresh = (dataUpdatedAt: number): boolean =>
  dataUpdatedAt + MUSEUM_SEARCH_STALE_TIME_MS > Date.now()

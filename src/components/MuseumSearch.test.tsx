import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MUSEUM_SEARCH_STALE_TIME_MS,
  SEARCH_DEBOUNCE_MS,
} from '../api/museumSearchQuery'
import {
  artGalleryFeature,
  createPhotonFeature,
  photonResponse,
  tateBritainFeature,
  tateModernFeature,
} from '../test/photonFixtures'
import { renderWithQueryClient } from '../test/renderWithQueryClient'
import MuseumSearch from './MuseumSearch'

type PhotonFeature = ReturnType<typeof createPhotonFeature>

const START_TIME = new Date('2026-01-01T10:00:00Z').getTime()
const WAITING_MESSAGE = 'Search starts when you stop typing.'
const SEARCHING_MESSAGE = 'Searching museums…'

const getRequestedQuery = (url: unknown) =>
  new URL(String(url)).searchParams.get('q')

const mockPhoton = (resultsByQuery: Record<string, PhotonFeature[]>) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) =>
      photonResponse(resultsByQuery[getRequestedQuery(url) ?? ''] ?? []),
    )

const createDeferredResponse = () => {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const advanceDebounce = () =>
  act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS))

const setup = () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const view = renderWithQueryClient(<MuseumSearch />)
  const input = screen.getByRole('searchbox', { name: 'Search museums' })

  const search = async (term: string) => {
    await user.clear(input)
    await user.type(input, term)
  }

  return { ...view, user, input, search }
}

const searchAndWaitForResults = async (
  search: (term: string) => Promise<void>,
  term: string,
  firstResultName: string,
) => {
  await search(term)
  await advanceDebounce()
  await screen.findByRole('button', { name: new RegExp(firstResultName) })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(START_TIME)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MuseumSearch', () => {
  it('shows matching museums and the full address of the selected museum', async () => {
    mockPhoton({ tate: [tateModernFeature, tateBritainFeature] })
    const { user, search } = setup()

    await searchAndWaitForResults(search, 'tate', 'Tate Modern')

    expect(screen.getByRole('status')).toHaveTextContent('2 museums found')
    const tateModern = screen.getByRole('button', { name: /Tate Modern/ })
    expect(tateModern).toHaveAttribute('aria-pressed', 'false')

    await user.click(tateModern)

    expect(tateModern).toHaveAttribute('aria-pressed', 'true')
    const details = screen.getByRole('region', { name: 'Tate Modern' })
    const address = details.querySelector('address')
    expect(address).toHaveTextContent('53 Bankside')
    expect(address).toHaveTextContent('SE1 9TG London · United Kingdom')
  })

  it('clears the search from the field button and keeps focus there', async () => {
    const { user, input } = setup()

    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()

    await user.type(input, 'es')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()
  })

  it('selects a museum using the keyboard', async () => {
    mockPhoton({ tate: [tateModernFeature, tateBritainFeature] })
    const { user, search } = setup()

    await searchAndWaitForResults(search, 'tate', 'Tate Modern')

    await user.tab()
    await user.tab()
    await user.tab()
    const tateBritain = screen.getByRole('button', { name: /Tate Britain/ })
    expect(tateBritain).toHaveFocus()

    await user.keyboard(' ')

    expect(tateBritain).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('region', { name: 'Tate Britain' }),
    ).toBeInTheDocument()
  })

  it('shows the map for the selected museum and keeps focus on the selected result', async () => {
    mockPhoton({ tate: [tateModernFeature, tateBritainFeature] })
    const { user, search } = setup()

    await searchAndWaitForResults(search, 'tate', 'Tate Modern')

    const tateModern = screen.getByRole('button', { name: /Tate Modern/ })
    await user.click(tateModern)
    expect(
      screen.getByRole('figure', {
        name: 'Map showing the location of Tate Modern',
      }),
    ).toBeInTheDocument()
    expect(tateModern).toHaveFocus()

    await user.click(screen.getByRole('button', { name: /Tate Britain/ }))

    expect(
      screen.getByRole('figure', {
        name: 'Map showing the location of Tate Britain',
      }),
    ).toHaveTextContent('51.4910° N, 0.1275° W')
    expect(
      screen.queryByRole('figure', {
        name: 'Map showing the location of Tate Modern',
      }),
    ).not.toBeInTheDocument()
  })

  it('does not show a map for a museum without coordinates', async () => {
    mockPhoton({ art: [artGalleryFeature] })
    const { user, search } = setup()

    await searchAndWaitForResults(search, 'art', 'Art Gallery of Alberta')
    await user.click(
      screen.getByRole('button', { name: /Art Gallery of Alberta/ }),
    )

    expect(
      screen.getByRole('region', { name: 'Art Gallery of Alberta' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('reveals further results from the same response and resets when the search changes', async () => {
    const features = Array.from({ length: 21 }, (_, index) =>
      createPhotonFeature({
        osm_id: index + 1,
        name: `Museum ${index + 1}`,
      }),
    )
    const fetchSpy = mockPhoton({ museum: features })
    const { user, search } = setup()

    await search('museum')
    await advanceDebounce()
    expect(
      await screen.findByRole('button', {
        name: (name) => name === 'Museum 1',
      }),
    ).toBeInTheDocument()

    const openResults = () =>
      screen
        .getAllByRole('button', { name: /^Museum / })
        .filter((button) => button.closest('li')?.hasAttribute('data-open'))
    const museum11 = () =>
      screen.getByRole('button', {
        name: (name) => name === 'Museum 11',
      })

    expect(openResults()).toHaveLength(10)
    expect(museum11().closest('li')).not.toHaveAttribute('data-open')
    expect(screen.getByRole('status')).toHaveTextContent('21 museums found')

    await user.click(screen.getByRole('button', { name: 'Show more museums' }))
    await user.click(screen.getByRole('button', { name: 'Show more museums' }))

    expect(museum11().closest('li')).toHaveAttribute('data-open')
    expect(openResults()).toHaveLength(21)
    expect(
      screen.queryByRole('button', { name: 'Show more museums' }),
    ).not.toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Show less' }))

    expect(openResults()).toHaveLength(10)
    expect(museum11().closest('li')).not.toHaveAttribute('data-open')
    expect(
      screen.getByRole('button', { name: 'Show more museums' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show more museums' }))
    await user.click(screen.getByRole('button', { name: 'Show more museums' }))
    await user.click(
      screen.getByRole('button', { name: (name) => name === 'Museum 21' }),
    )
    await user.click(screen.getByRole('button', { name: 'Show less' }))

    const selected = screen.getByRole('button', {
      name: (name) => name === 'Museum 21',
    })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(selected.closest('li')).toHaveAttribute('data-open')
    expect(openResults()).toHaveLength(11)

    await search('museum')
    await advanceDebounce()

    expect(openResults()).toHaveLength(10)
    expect(
      screen.getByRole('button', { name: 'Show more museums' }),
    ).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('shows a message when no museums match', async () => {
    mockPhoton({})
    const { search } = setup()

    await search('zzzz')
    await advanceDebounce()

    expect(
      await screen.findByText('No museums found for “zzzz”.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows an error without retrying automatically and retries on request', async () => {
    const retryResponse = createDeferredResponse()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockReturnValueOnce(retryResponse.promise)
    const { user, search } = setup()

    await search('tate')
    await advanceDebounce()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong while searching.')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const retryButton = within(alert).getByRole('button', { name: 'Try again' })
    retryButton.focus()
    await user.keyboard('{Enter}')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent(SEARCHING_MESSAGE)
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Something went wrong while searching.')
    expect(retryButton).toHaveFocus()
    expect(retryButton).toHaveAccessibleName('Retrying…')
    expect(retryButton).toHaveAttribute('aria-disabled', 'true')

    await user.keyboard('{Enter}')
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    await act(async () =>
      retryResponse.resolve(photonResponse([tateModernFeature])),
    )

    expect(
      await screen.findByRole('button', { name: /Tate Modern/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the error and re-enables retry when the retry also fails', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () => new Response('Unavailable', { status: 503 }),
      )
    const { user, search } = setup()

    await search('tate')
    await advanceDebounce()
    const alert = await screen.findByRole('alert')
    const retryButton = within(alert).getByRole('button', { name: 'Try again' })

    await user.click(retryButton)

    expect(
      await within(alert).findByRole('button', { name: 'Try again' }),
    ).toHaveAttribute('aria-disabled', 'false')
    expect(retryButton).toHaveFocus()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('shows an error when the network request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )
    const { search } = setup()

    await search('tate')
    await advanceDebounce()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('does not search until at least three characters are entered', async () => {
    const fetchSpy = mockPhoton({})
    const { search } = setup()

    await search('ta')
    await advanceDebounce()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('waits for the debounce and sends one request for the final term', async () => {
    const fetchSpy = mockPhoton({ 'tate m': [tateModernFeature] })
    const { search } = setup()

    await search('tate m')

    expect(screen.getByRole('status')).toHaveTextContent(WAITING_MESSAGE)
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS / 2))
    expect(fetchSpy).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS / 2))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(getRequestedQuery(fetchSpy.mock.calls[0][0])).toBe('tate m')
    expect(
      await screen.findByRole('button', { name: /Tate Modern/ }),
    ).toBeInTheDocument()
  })

  it('shows cached results immediately when a term is revisited within five minutes', async () => {
    const fetchSpy = mockPhoton({
      tate: [tateModernFeature],
      art: [artGalleryFeature],
    })
    const { search } = setup()

    await searchAndWaitForResults(search, 'tate', 'Tate Modern')
    await searchAndWaitForResults(search, 'art', 'Art Gallery of Alberta')
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    vi.setSystemTime(START_TIME + MUSEUM_SEARCH_STALE_TIME_MS - 60_000)
    await search('Tate')

    expect(
      screen.getByRole('button', { name: /Tate Modern/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Art Gallery/ }),
    ).not.toBeInTheDocument()

    await advanceDebounce()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole('button', { name: /Tate Modern/ }),
    ).toBeInTheDocument()
  })

  it('does not show expired results and fetches fresh ones after five minutes', async () => {
    const refreshedResponse = createDeferredResponse()
    const fetchSpy = mockPhoton({
      tate: [tateModernFeature],
      art: [artGalleryFeature],
    })
    const { search } = setup()

    await searchAndWaitForResults(search, 'tate', 'Tate Modern')
    const tateFetchedAt = Date.now()
    await searchAndWaitForResults(search, 'art', 'Art Gallery of Alberta')
    fetchSpy.mockReturnValueOnce(refreshedResponse.promise)

    vi.setSystemTime(tateFetchedAt + MUSEUM_SEARCH_STALE_TIME_MS)
    await search('tate')

    expect(screen.getByRole('status')).toHaveTextContent(WAITING_MESSAGE)
    expect(
      screen.queryByRole('button', { name: /Tate Modern/ }),
    ).not.toBeInTheDocument()

    await advanceDebounce()

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('status')).toHaveTextContent(SEARCHING_MESSAGE)
    expect(
      screen.queryByRole('button', { name: /Tate Modern/ }),
    ).not.toBeInTheDocument()

    await act(async () =>
      refreshedResponse.resolve(photonResponse([tateBritainFeature])),
    )

    expect(
      await screen.findByRole('button', { name: /Tate Britain/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Tate Modern/ }),
    ).not.toBeInTheDocument()
  })

  it('cancels the in-flight request when the search term changes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const { user, input } = setup()

    await user.type(input, 'tate')
    await advanceDebounce()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const firstSignal = fetchSpy.mock.calls[0][1]?.signal

    await user.type(input, 's')

    expect(firstSignal?.aborted).toBe(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('never shows results from an earlier term when responses arrive late', async () => {
    const tateResponse = createDeferredResponse()
    const artResponse = createDeferredResponse()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      getRequestedQuery(url) === 'tate'
        ? tateResponse.promise
        : artResponse.promise,
    )
    const { search } = setup()

    await search('tate')
    await advanceDebounce()
    await search('art')
    await advanceDebounce()

    await act(async () =>
      tateResponse.resolve(photonResponse([tateModernFeature])),
    )
    expect(
      screen.queryByRole('button', { name: /Tate Modern/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(SEARCHING_MESSAGE)

    await act(async () =>
      artResponse.resolve(photonResponse([artGalleryFeature])),
    )

    expect(
      await screen.findByRole('button', { name: /Art Gallery of Alberta/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Tate Modern/ }),
    ).not.toBeInTheDocument()
  })

  it('clears the selection as soon as the search term changes', async () => {
    mockPhoton({ tate: [tateModernFeature] })
    const { user, input, search } = setup()

    await searchAndWaitForResults(search, 'tate', 'Tate Modern')
    await user.click(screen.getByRole('button', { name: /Tate Modern/ }))
    expect(
      screen.getByRole('region', { name: 'Tate Modern' }),
    ).toBeInTheDocument()

    await user.type(input, ' m')

    expect(
      screen.queryByRole('region', { name: 'Tate Modern' }),
    ).not.toBeInTheDocument()
  })
})

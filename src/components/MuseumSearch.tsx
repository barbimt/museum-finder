import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  isMuseumSearchFresh,
  museumSearchQueryOptions,
  normaliseQuery,
} from '../api/museumSearchQuery'
import MuseumDetails from './MuseumDetails'
import MuseumResults from './MuseumResults'

const RESULTS_PAGE_SIZE = 10

const formatResultCount = (count: number): string =>
  count === 1 ? '1 museum found' : `${count} museums found`

const MuseumSearch = () => {
  const inputId = useId()
  const hintId = useId()
  const resultsHeadingId = useId()
  const detailsHeadingId = useId()
  const detailsRef = useRef<HTMLElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedMuseumId, setSelectedMuseumId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE)

  const query = normaliseQuery(inputValue)
  const isSearchable = query.length >= MIN_QUERY_LENGTH
  const isWaitingForDebounce = isSearchable && debouncedQuery !== query

  useEffect(() => {
    const timeoutId = setTimeout(
      () => setDebouncedQuery(query),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timeoutId)
  }, [query])

  const { data, dataUpdatedAt, errorUpdatedAt, isFetching, refetch } = useQuery(
    {
      ...museumSearchQueryOptions(query),
      enabled: isSearchable && !isWaitingForDebounce,
    },
  )

  // `isError` resets to pending while a query without data refetches, so the error persists until a success.
  const hasLastFetchFailed = errorUpdatedAt > dataUpdatedAt
  const canShowData = isWaitingForDebounce
    ? isMuseumSearchFresh(dataUpdatedAt)
    : !hasLastFetchFailed
  const museums =
    isSearchable && !isFetching && data && canShowData ? data : undefined
  const hasMoreResults = Boolean(museums && visibleCount < museums.length)
  const canCollapse = Boolean(
    museums && museums.length > RESULTS_PAGE_SIZE && !hasMoreResults,
  )
  const selectedMuseum = museums?.find(
    (museum) => museum.id === selectedMuseumId,
  )
  const showError = isSearchable && !isWaitingForDebounce && hasLastFetchFailed
  const isRetrying = showError && isFetching

  const getStatusMessage = (): string => {
    if (!isSearchable) return ''
    if (isFetching) return 'Searching museums…'
    if (museums) {
      return museums.length > 0
        ? formatResultCount(museums.length)
        : `No museums found for “${inputValue.trim()}”.`
    }
    if (isWaitingForDebounce) return 'Search starts when you stop typing.'
    if (hasLastFetchFailed) return ''
    return 'Searching museums…'
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const handleRetry = () => {
    if (!isRetrying) refetch()
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setSelectedMuseumId(null)
    setVisibleCount(RESULTS_PAGE_SIZE)
  }

  const handleShowMore = () => {
    setVisibleCount((count) => count + RESULTS_PAGE_SIZE)
  }

  const handleShowLess = () => {
    setVisibleCount(RESULTS_PAGE_SIZE)
  }

  const handleSelect = (museumId: string) => {
    // Commit the new details before scrolling, so their final size is known.
    flushSync(() => setSelectedMuseumId(museumId))
    detailsRef.current?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <div className="museum-search">
      <form
        role="search"
        className="museum-search__form"
        onSubmit={handleSubmit}
      >
        <label htmlFor={inputId} className="museum-search__label">
          Search museums
        </label>
        <div className="museum-search__field">
          <Search className="museum-search__icon" size={20} strokeWidth={1.8} />
          <input
            id={inputId}
            className="museum-search__input"
            type="search"
            value={inputValue}
            placeholder="Museum name or city"
            autoComplete="off"
            aria-describedby={hintId}
            onChange={(event) => handleInputChange(event.target.value)}
          />
        </div>
        <p id={hintId} className="museum-search__hint">
          Enter at least {MIN_QUERY_LENGTH} characters.
        </p>
      </form>

      <div className="museum-search__layout">
        <section
          className="museum-search__results"
          aria-labelledby={resultsHeadingId}
        >
          <h2 id={resultsHeadingId} className="section-label">
            Results
          </h2>

          <p
            role="status"
            className="museum-search__status"
            data-loading={isFetching || undefined}
          >
            {getStatusMessage()}
          </p>

          {!isSearchable && (
            <p className="message">
              Start typing a museum name or city to see results.
            </p>
          )}

          {showError && (
            <div role="alert" className="message message--error">
              <p>Something went wrong while searching.</p>
              {/* aria-disabled rather than disabled, so the button keeps keyboard focus while retrying. */}
              <button
                type="button"
                className="button"
                aria-disabled={isRetrying}
                onClick={handleRetry}
              >
                {isRetrying ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}

          {museums && museums.length > 0 && (
            <>
              <MuseumResults
                museums={museums}
                visibleCount={visibleCount}
                selectedMuseumId={selectedMuseumId}
                onSelect={handleSelect}
              />
              {(hasMoreResults || canCollapse) && (
                <button
                  type="button"
                  className="museum-results__more"
                  onClick={canCollapse ? handleShowLess : handleShowMore}
                >
                  {canCollapse ? 'Show less' : 'Show more museums'}
                  {canCollapse ? (
                    <ChevronUp size={18} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={18} strokeWidth={2} />
                  )}
                </button>
              )}
            </>
          )}
        </section>

        <aside
          ref={detailsRef}
          className="museum-search__details"
          aria-labelledby={detailsHeadingId}
        >
          <h2 id={detailsHeadingId} className="section-label">
            Selected museum
          </h2>
          {selectedMuseum ? (
            <MuseumDetails museum={selectedMuseum} />
          ) : (
            <p className="message">
              Select a museum from the list to see its full address.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

export default MuseumSearch

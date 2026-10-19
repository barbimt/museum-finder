import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  isMuseumSearchFresh,
  museumSearchQueryOptions,
  normaliseQuery,
} from '../api/museumSearchQuery'
import MuseumDetails from './MuseumDetails'
import MuseumResults from './MuseumResults'

const formatResultCount = (count: number): string =>
  count === 1 ? '1 museum found' : `${count} museums found`

const MuseumSearch = () => {
  const inputId = useId()
  const hintId = useId()
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedMuseumId, setSelectedMuseumId] = useState<string | null>(null)

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
  }

  return (
    <div className="museum-search">
      <form
        role="search"
        className="museum-search__form"
        onSubmit={handleSubmit}
      >
        <label htmlFor={inputId}>Search museums</label>
        <input
          id={inputId}
          type="search"
          value={inputValue}
          autoComplete="off"
          aria-describedby={hintId}
          onChange={(event) => handleInputChange(event.target.value)}
        />
        <p id={hintId} className="museum-search__hint">
          Enter at least {MIN_QUERY_LENGTH} characters.
        </p>
      </form>

      <p role="status" className="museum-search__status">
        {getStatusMessage()}
      </p>

      {showError && (
        <div role="alert" className="museum-search__error">
          <p>Something went wrong while searching.</p>
          {/* aria-disabled rather than disabled, so the button keeps keyboard focus while retrying. */}
          <button
            type="button"
            aria-disabled={isRetrying}
            onClick={handleRetry}
          >
            {isRetrying ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      {museums && museums.length > 0 && (
        <MuseumResults
          museums={museums}
          selectedMuseumId={selectedMuseumId}
          onSelect={setSelectedMuseumId}
        />
      )}

      {selectedMuseum && <MuseumDetails museum={selectedMuseum} />}
    </div>
  )
}

export default MuseumSearch

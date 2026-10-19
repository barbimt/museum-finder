import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

export const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = createTestQueryClient()

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
  }
}

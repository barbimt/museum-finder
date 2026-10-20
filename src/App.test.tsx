import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'
import { renderWithQueryClient } from './test/renderWithQueryClient'

it('renders the heading and museum search input', () => {
  renderWithQueryClient(<App />)

  expect(
    screen.getByRole('heading', { level: 1, name: 'Discover museums' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('searchbox', { name: 'Search museums' }),
  ).toBeInTheDocument()
})

import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'
import { renderWithQueryClient } from './test/renderWithQueryClient'

it('renders the heading and museum search input', () => {
  renderWithQueryClient(<App />)

  expect(
    screen.getByRole('heading', { name: 'Museum Search' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('searchbox', { name: 'Search museums' }),
  ).toBeInTheDocument()
})

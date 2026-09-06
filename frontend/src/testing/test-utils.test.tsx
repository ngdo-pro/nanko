import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from './test-utils'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'

function SampleComponent() {
  const location = useLocation()
  const { data, isLoading } = useQuery({
    queryKey: ['sample'],
    queryFn: () => Promise.resolve('hello query'),
  })

  if (isLoading) return <div>chargement...</div>
  return (
    <div>
      <span>Path: {location.pathname}</span>
      <span>Data: {data}</span>
    </div>
  )
}

describe('renderWithProviders', () => {
  it('fournit le contexte TanStack Query et React Router', async () => {
    renderWithProviders(<SampleComponent />, {
      routerInitialEntries: ['/dashboard'],
    })

    expect(await screen.findByText('Path: /dashboard')).toBeInTheDocument()
    expect(await screen.findByText('Data: hello query')).toBeInTheDocument()
  })
})

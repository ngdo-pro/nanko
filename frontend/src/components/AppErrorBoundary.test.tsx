import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppErrorBoundary } from './AppErrorBoundary'

// Component that throws on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test component render explosion')
  }
  return <div data-testid="normal-content">Everything is fine</div>
}

describe('AppErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    render(
      <AppErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('normal-content')).toBeInTheDocument()
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument()
  })

  it('catches render error, displays incident card and incident ID', () => {
    render(
      <AppErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </AppErrorBoundary>,
    )

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
    expect(screen.getByText('Une anomalie inattendue est survenue')).toBeInTheDocument()
    expect(screen.getByText("Identifiant d'incident :")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Recharger l'application" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Retour à l'accueil" })).toBeInTheDocument()
  })

  it('triggers reload when clicking reload button', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock, href: 'http://localhost/' },
      writable: true,
    })

    render(
      <AppErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </AppErrorBoundary>,
    )

    const reloadButton = screen.getByRole('button', { name: "Recharger l'application" })
    fireEvent.click(reloadButton)

    expect(reloadMock).toHaveBeenCalled()
  })
})

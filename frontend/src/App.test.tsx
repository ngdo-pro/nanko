import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import * as useAuthModule from './auth/useAuth'

vi.mock('./auth/useAuth')

describe('App Root Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche l écran de chargement lorsque Keycloak est en cours d initialisation', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('app-loading')).toBeInTheDocument()
    expect(screen.getByText(/Initialisation de la session/i)).toBeInTheDocument()
  })

  it('affiche UnauthenticatedView lorsque l utilisateur n est pas connecté', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('unauthenticated-view')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-view')).not.toBeInTheDocument()
    expect(screen.queryByText('Projets')).not.toBeInTheDocument()
  })

  it('affiche DashboardView et les liens de navigation lorsque l utilisateur est connecté', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-id',
        email: 'developer@nanko.dev',
        keycloakId: 'kc-123',
        createdAt: '2026-09-05T08:00:00.000Z',
      },
      token: 'jwt-token',
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(<App />)

    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
    expect(screen.getByText('Projets')).toBeInTheDocument()
    expect(screen.getByText('Organisations')).toBeInTheDocument()
    expect(screen.getAllByText('developer@nanko.dev')).toHaveLength(2)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserMenu } from './UserMenu'
import * as useAuthModule from '../auth/useAuth'

vi.mock('../auth/useAuth')

describe('UserMenu', () => {
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche un état de chargement lorsque isLoading est vrai', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      login: mockLogin,
      logout: mockLogout,
    })

    render(<UserMenu />)

    expect(screen.getByTestId('user-menu-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument()
  })

  it('affiche le bouton Se connecter lorsque l utilisateur n est pas authentifié', async () => {
    const user = userEvent.setup()
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      login: mockLogin,
      logout: mockLogout,
    })

    render(<UserMenu />)

    const loginButton = screen.getByTestId('login-button')
    expect(loginButton).toBeInTheDocument()
    expect(loginButton).toHaveTextContent('Se connecter')

    await user.click(loginButton)
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('affiche l avatar, l email et le bouton de déconnexion lorsque authentifié', async () => {
    const user = userEvent.setup()
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'architect@nanko.dev',
        keycloakId: 'kc-123',
        createdAt: '2026-09-05T08:00:00.000Z',
      },
      token: 'jwt-token',
      login: mockLogin,
      logout: mockLogout,
    })

    render(<UserMenu />)

    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    expect(screen.getByTestId('user-email')).toHaveTextContent('architect@nanko.dev')
    expect(screen.getByText('A')).toBeInTheDocument() // Initiale de architect

    const logoutButton = screen.getByTestId('logout-button')
    expect(logoutButton).toBeInTheDocument()

    await user.click(logoutButton)
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})

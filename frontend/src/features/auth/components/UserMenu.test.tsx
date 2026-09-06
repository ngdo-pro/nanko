import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserMenu } from './UserMenu'
import * as useAuthModule from '../hooks/useAuth'

vi.mock('../hooks/useAuth')

describe('UserMenu', () => {
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le loader de statut pendant le chargement Keycloak', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      login: mockLogin,
      logout: mockLogout,
    })

    render(<UserMenu />)

    const loadingIndicator = screen.getByTestId('user-menu-loading')
    expect(loadingIndicator).toBeInTheDocument()
    expect(loadingIndicator).toHaveAttribute('data-qa', 'user-menu-loading')
  })

  it('affiche le bouton de connexion lorsque l utilisateur n est pas authentifié', async () => {
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
    expect(loginButton).toHaveAttribute('data-qa', 'login-button')
    expect(loginButton).toHaveTextContent('Se connecter')

    await user.click(loginButton)
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('affiche le menu utilisateur avec avatar, email et bouton de déconnexion', async () => {
    const user = userEvent.setup()

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        keycloakId: 'kc-123',
        email: 'architect@nanko.dev',
        createdAt: '2026-09-05T08:00:00.000Z',
      },
      token: 'valid-token',
      login: mockLogin,
      logout: mockLogout,
    })

    render(<UserMenu />)

    const userMenu = screen.getByTestId('user-menu')
    expect(userMenu).toBeInTheDocument()
    expect(userMenu).toHaveAttribute('data-qa', 'user-menu')

    const avatar = screen.getByText('A')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('data-qa', 'user-avatar')

    const email = screen.getByTestId('user-email')
    expect(email).toBeInTheDocument()
    expect(email).toHaveAttribute('data-qa', 'user-email')
    expect(email).toHaveTextContent('architect@nanko.dev')

    const logoutButton = screen.getByTestId('logout-button')
    expect(logoutButton).toBeInTheDocument()
    expect(logoutButton).toHaveAttribute('data-qa', 'logout-button')
    expect(logoutButton).toHaveTextContent('Déconnexion')

    await user.click(logoutButton)
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})

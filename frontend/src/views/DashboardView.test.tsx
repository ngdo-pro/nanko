import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardView } from './DashboardView'
import * as useAuthModule from '../auth/useAuth'

vi.mock('../auth/useAuth')

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-uuid',
        email: 'architect@nanko.dev',
        keycloakId: 'kc-123',
        createdAt: '2026-09-05T08:00:00.000Z',
      },
      token: 'valid-token',
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('affiche le message de bienvenue avec l email de l utilisateur', () => {
    render(<DashboardView />)

    expect(screen.getByText('architect@nanko.dev')).toBeInTheDocument()
    expect(
      screen.getByText(/Espace de travail actif/i)
    ).toBeInTheDocument()
  })

  it('affiche l état vide invitant à créer ou importer un document', () => {
    render(<DashboardView />)

    expect(
      screen.getByText('Aucun document d\'architecture pour le moment')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /\+ Nouveau Document/i })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /↑ Importer un \.nanko/i })
    ).toBeInTheDocument()
  })

  it('affiche le rappel syntaxique rapide', () => {
    render(<DashboardView />)

    expect(screen.getByText('RAPPEL SYNTAXIQUE RAPIDE')).toBeInTheDocument()
    expect(screen.getByText(/@id \[nom\]/i)).toBeInTheDocument()
  })

  it('permet de surcharger l email via prop userEmail', () => {
    render(<DashboardView userEmail="custom@nanko.dev" />)

    expect(screen.getByText('custom@nanko.dev')).toBeInTheDocument()
  })
})

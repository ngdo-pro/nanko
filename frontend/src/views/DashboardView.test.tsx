import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '@/testing/test-utils'
import { DashboardView } from './DashboardView'
import * as authModule from '@/features/auth'
import * as workspaceModule from '@/features/workspaces'

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth')>()
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

vi.mock('@/features/workspaces', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/workspaces')>()
  return {
    ...actual,
    useWorkspace: vi.fn(),
    CreateProjectModal: vi.fn(() => null),
  }
})

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authModule.useAuth).mockReturnValue({
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

    vi.mocked(workspaceModule.useWorkspace).mockReturnValue({
      organisations: [
        {
          id: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
          name: 'Espace personnel',
          slug: 'personal-0191c0a1',
          isPersonal: true,
          role: 'owner',
          createdAt: '2026-09-06T12:00:00Z',
          projects: [
            {
              id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
              organisationId: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
              name: 'Mon premier projet',
              slug: 'mon-premier-projet',
              createdAt: '2026-09-06T12:00:00Z',
            },
          ],
        },
      ],
      activeOrganisation: {
        id: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
        name: 'Espace personnel',
        slug: 'personal-0191c0a1',
        isPersonal: true,
        role: 'owner',
        createdAt: '2026-09-06T12:00:00Z',
        projects: [
          {
            id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
            organisationId: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
            name: 'Mon premier projet',
            slug: 'mon-premier-projet',
            createdAt: '2026-09-06T12:00:00Z',
          },
        ],
      },
      activeProject: {
        id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
        organisationId: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
        name: 'Mon premier projet',
        slug: 'mon-premier-projet',
        createdAt: '2026-09-06T12:00:00Z',
      },
      projects: [
        {
          id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
          organisationId: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
          name: 'Mon premier projet',
          slug: 'mon-premier-projet',
          createdAt: '2026-09-06T12:00:00Z',
        },
      ],
      isSolo: true,
      isLoading: false,
      setActiveOrganisation: vi.fn(),
      setActiveProject: vi.fn(),
      refetchOrganisations: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('affiche le message de bienvenue avec l email de l utilisateur', () => {
    renderWithProviders(<DashboardView />)

    expect(screen.getByText('architect@nanko.dev')).toBeInTheDocument()
    expect(
      screen.getByText(/Espace de travail actif/i)
    ).toBeInTheDocument()
  })

  it('affiche la liste des projets et le projet actif', () => {
    renderWithProviders(<DashboardView />)

    expect(screen.getByText('Mes Projets')).toBeInTheDocument()
    expect(screen.getByText('Mon premier projet')).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Nouveau Projet/i })).toBeInTheDocument()
  })

  it('affiche l état vide sous le projet actif', () => {
    renderWithProviders(<DashboardView />)

    expect(
      screen.getByText('Projet : Mon premier projet')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /\+ Nouveau Document/i })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /↑ Importer un \.nanko/i })
    ).toBeInTheDocument()
  })

  it('affiche le rappel syntaxique rapide', () => {
    renderWithProviders(<DashboardView />)

    expect(screen.getByText('RAPPEL SYNTAXIQUE RAPIDE')).toBeInTheDocument()
    expect(screen.getByText(/@id \[nom\]/i)).toBeInTheDocument()
  })

  it('permet de surcharger l email via prop userEmail', () => {
    renderWithProviders(<DashboardView userEmail="custom@nanko.dev" />)

    expect(screen.getByText('custom@nanko.dev')).toBeInTheDocument()
  })
})

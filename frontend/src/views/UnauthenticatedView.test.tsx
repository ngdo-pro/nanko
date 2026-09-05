import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnauthenticatedView } from './UnauthenticatedView'
import * as useAuthModule from '../auth/useAuth'

vi.mock('../auth/useAuth')

describe('UnauthenticatedView', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      login: mockLogin,
      logout: vi.fn(),
    })
  })

  it('rend le portail Nanko avec son slogan et le code .nanko', () => {
    render(<UnauthenticatedView />)

    // Vérification du titre / slogan
    expect(
      screen.getByText(/Vos diagrammes d'architecture/i)
    ).toBeInTheDocument()

    // Vérification de la prévisualisation de code .nanko
    expect(screen.getByText('nanko-platform.nanko')).toBeInTheDocument()
    expect(screen.getByText(/@id platform-overview/i)).toBeInTheDocument()

    // Vérification des piliers
    expect(screen.getByText('Base de données source de vérité')).toBeInTheDocument()
    expect(screen.getByText('Rendu déterministe C4')).toBeInTheDocument()
    expect(screen.getByText('Navigation multi-layer')).toBeInTheDocument()
  })

  it('ne contient aucune référence ni reliquat de Vite ou React demo', () => {
    const { container } = render(<UnauthenticatedView />)

    const textContent = container.textContent || ''
    expect(textContent).not.toContain('Count is')
    expect(textContent).not.toContain('HMR')
    expect(textContent).not.toContain('Edit src/App.tsx')
    expect(textContent).not.toContain('Join the Vite community')
    expect(textContent).not.toContain('Explore Vite')
  })

  it('déclenche le login au clic sur le bouton CTA', async () => {
    const user = userEvent.setup()
    render(<UnauthenticatedView />)

    const ctaButton = screen.getByRole('button', { name: /Se connecter \/ Créer un compte/i })
    expect(ctaButton).toBeInTheDocument()

    await user.click(ctaButton)
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })
})

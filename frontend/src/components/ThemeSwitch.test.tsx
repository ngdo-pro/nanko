import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeSwitch } from './ThemeSwitch'
import { THEME_STORAGE_KEY } from './theme'

describe('ThemeSwitch', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('rend les 3 options de thème (clair, système, sombre)', () => {
    render(<ThemeSwitch />)

    expect(screen.getByRole('button', { name: /thème clair/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /suivre le système/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thème sombre/i })).toBeInTheDocument()
  })

  it('bascule vers le thème sombre au clic et met à jour localStorage et data-theme', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    const darkButton = screen.getByRole('button', { name: /thème sombre/i })
    await user.click(darkButton)

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(darkButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('bascule vers le thème clair au clic', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    const lightButton = screen.getByRole('button', { name: /thème clair/i })
    await user.click(lightButton)

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(lightButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('revient au mode système en supprimant data-theme et la clé localStorage', async () => {
    const user = userEvent.setup()
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    render(<ThemeSwitch />)

    const systemButton = screen.getByRole('button', { name: /suivre le système/i })
    await user.click(systemButton)

    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(systemButton).toHaveAttribute('aria-pressed', 'true')
  })
})

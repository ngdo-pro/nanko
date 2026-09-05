import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandLogo, BrandIcon } from './BrandLogo'

describe('BrandLogo', () => {
  it('rend correctement le logo avec la classe nav-logo et le nom NANKO', () => {
    render(<BrandLogo />)

    const logoLink = screen.getByRole('link', { name: /nanko/i })
    expect(logoLink).toBeInTheDocument()
    expect(logoLink).toHaveClass('nav-logo')
    expect(logoLink).toHaveTextContent('NANKO')
  })

  it('affiche la baseline ARCHITECTURE DE CODE lorsque withTagline est activé', () => {
    render(<BrandLogo withTagline={true} />)

    expect(screen.getByText('ARCHITECTURE DE CODE')).toBeInTheDocument()
  })

  it('ne montre pas la baseline par défaut', () => {
    render(<BrandLogo />)

    expect(screen.queryByText('ARCHITECTURE DE CODE')).not.toBeInTheDocument()
  })

  it('rend le composant BrandIcon vectoriel SVG', () => {
    const { container } = render(<BrandIcon size={32} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '32')
  })
})

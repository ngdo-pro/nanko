import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RadialMenu } from './RadialMenu'
import { SECTORS } from './radialMenuConfig'

describe('RadialMenu', () => {
  it('affiche la roue radiale à la position spécifiée avec les secteurs Rectangle et Circle', () => {
    const handleSelect = vi.fn()
    const handleClose = vi.fn()

    render(
      <RadialMenu
        x={250}
        y={350}
        onSelect={handleSelect}
        onClose={handleClose}
      />,
    )

    const menu = screen.getByTestId('radial-menu')
    expect(menu).toBeInTheDocument()
    expect(menu).toHaveStyle({ left: '250px', top: '350px' })

    expect(screen.getByTestId('radial-item-rectangle')).toBeInTheDocument()
    expect(screen.getByTestId('radial-item-circle')).toBeInTheDocument()
    expect(screen.queryByTestId('radial-item-text')).not.toBeInTheDocument()
    expect(screen.getByTestId('radial-center-cancel')).toBeInTheDocument()
  })

  it('déclenche onSelect avec "rectangle" au clic sur le secteur rectangle', () => {
    const handleSelect = vi.fn()

    render(
      <RadialMenu
        x={100}
        y={100}
        onSelect={handleSelect}
      />,
    )

    fireEvent.click(screen.getByTestId('radial-item-rectangle'))
    expect(handleSelect).toHaveBeenCalledWith('rectangle')
  })

  it('déclenche onSelect avec "circle" au clic sur le secteur circle', () => {
    const handleSelect = vi.fn()

    render(
      <RadialMenu
        x={100}
        y={100}
        onSelect={handleSelect}
      />,
    )

    fireEvent.click(screen.getByTestId('radial-item-circle'))
    expect(handleSelect).toHaveBeenCalledWith('circle')
  })

  it('déclenche onClose au clic sur la pastille centrale', () => {
    const handleClose = vi.fn()

    render(
      <RadialMenu
        x={100}
        y={100}
        onSelect={vi.fn()}
        onClose={handleClose}
      />,
    )

    fireEvent.click(screen.getByTestId('radial-center-cancel'))
    expect(handleClose).toHaveBeenCalled()
  })

  it('appelle onHoverSector avec le type au survol et null en quittant', () => {
    const handleHover = vi.fn()

    render(
      <RadialMenu
        x={100}
        y={100}
        onSelect={vi.fn()}
        onHoverSector={handleHover}
      />,
    )

    const rectSector = screen.getByTestId('radial-item-rectangle')
    const centerBtn = screen.getByTestId('radial-center-cancel')

    fireEvent.mouseEnter(rectSector)
    expect(handleHover).toHaveBeenCalledWith('rectangle')

    fireEvent.mouseLeave(rectSector)
    expect(handleHover).toHaveBeenCalledWith(null)

    fireEvent.mouseEnter(centerBtn)
    expect(handleHover).toHaveBeenCalledWith(null)
  })

  describe('Géométrie des secteurs (Roue fermée à 360°)', () => {
    it('ferme complètement le cercle : 2 demi-disques de 180° contigus sans gap', () => {
      // 1. Exactement 2 secteurs
      expect(SECTORS).toHaveLength(2)

      const rectSector = SECTORS.find((s) => s.type === 'rectangle')
      const circleSector = SECTORS.find((s) => s.type === 'circle')

      expect(rectSector).toBeDefined()
      expect(circleSector).toBeDefined()

      // 2. Continuité angulaire : pas de trou/gap entre les secteurs
      // Circle : 0° à 180°
      expect(circleSector!.startAngle).toBe(0)
      expect(circleSector!.endAngle).toBe(180)

      // Rectangle : 180° à 360° (359.99° en SVG pour arc non-dégénéré)
      expect(rectSector!.startAngle).toBe(180)
      expect(rectSector!.endAngle).toBeCloseTo(360, 1)

      // La somme des amplitudes couvre 360°
      const totalSpan = (circleSector!.endAngle - circleSector!.startAngle) + (rectSector!.endAngle - rectSector!.startAngle)
      expect(totalSpan).toBeCloseTo(360, 1)
    })

    it('génère des tracés SVG fermés couvrant les deux hémisphères sans discontinuité', () => {
      const { container } = render(
        <RadialMenu
          x={100}
          y={100}
          onSelect={vi.fn()}
        />,
      )

      const paths = container.querySelectorAll('.radial-sector-path')
      expect(paths).toHaveLength(2)

      // Les deux chemins doivent être valides et débuter par un Move (M) et se clore par Z
      paths.forEach((path) => {
        const d = path.getAttribute('d')
        expect(d).toBeTruthy()
        expect(d).toMatch(/^M /)
        expect(d).toMatch(/ Z$/)
      })
    })
  })
})

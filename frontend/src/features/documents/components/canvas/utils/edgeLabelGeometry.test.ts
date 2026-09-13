import { describe, it, expect } from 'vitest'
import {
  projectPointOnOrthogonalSegments,
  projectPointOnEdgePath,
} from './edgeLabelGeometry'
import type { OrthogonalSegment } from './lineJumps'

describe('edgeLabelGeometry', () => {
  it('projette un point sur un segment horizontal unique en restant centré sur le trait', () => {
    const segments: OrthogonalSegment[] = [
      {
        start: { x: 50, y: 100 },
        end: { x: 350, y: 100 },
        orientation: 'horizontal',
      },
    ]

    // Point 50px au-dessus du trait
    const projAbove = projectPointOnOrthogonalSegments({ x: 150, y: 50 }, segments)
    expect(projAbove.y).toBe(100) // Reste strictement centré sur le trait Y=100
    expect(projAbove.x).toBe(150)

    // Point 80px en-dessous du trait
    const projBelow = projectPointOnOrthogonalSegments({ x: 220, y: 180 }, segments)
    expect(projBelow.y).toBe(100)
    expect(projBelow.x).toBe(220)
  })

  it('borne le déplacement du label pour ne pas dépasser les extrémités du connecteur', () => {
    const segments: OrthogonalSegment[] = [
      {
        start: { x: 50, y: 100 },
        end: { x: 350, y: 100 },
        orientation: 'horizontal',
      },
    ]

    // Point au-delà de la fin droite
    const projFarRight = projectPointOnOrthogonalSegments({ x: 500, y: 100 }, segments, 10)
    expect(projFarRight.x).toBe(340) // 350 - padding 10
    expect(projFarRight.y).toBe(100)

    // Point en deçà du début gauche
    const projFarLeft = projectPointOnOrthogonalSegments({ x: 10, y: 100 }, segments, 10)
    expect(projFarLeft.x).toBe(60) // 50 + padding 10
    expect(projFarLeft.y).toBe(100)
  })

  it('projette sur le segment le plus proche lors d un tracé coudé (L-shape)', () => {
    // Tracé de (50, 100) à (200, 100), puis de (200, 100) à (200, 300)
    const segments: OrthogonalSegment[] = [
      {
        start: { x: 50, y: 100 },
        end: { x: 200, y: 100 },
        orientation: 'horizontal',
      },
      {
        start: { x: 200, y: 100 },
        end: { x: 200, y: 300 },
        orientation: 'vertical',
      },
    ]

    // Plus proche du segment horizontal
    const projH = projectPointOnOrthogonalSegments({ x: 120, y: 110 }, segments)
    expect(projH.x).toBe(120)
    expect(projH.y).toBe(100)
    expect(projH.orientation).toBe('horizontal')

    // Plus proche du segment vertical
    const projV = projectPointOnOrthogonalSegments({ x: 215, y: 220 }, segments)
    expect(projV.x).toBe(200)
    expect(projV.y).toBe(220)
    expect(projV.orientation).toBe('vertical')
  })

  it('projette directement à partir d un chemin SVG (projectPointOnEdgePath)', () => {
    const svgPath = 'M 50 150 L 350 150'
    const result = projectPointOnEdgePath({ x: 180, y: 300 }, svgPath)

    expect(result.y).toBe(150) // strictement sur le trait Y=150
    expect(result.x).toBe(180)
  })
})

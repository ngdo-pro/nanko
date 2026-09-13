import { describe, it, expect } from 'vitest'
import {
  quickSpawnConnectedShape,
  getOppositeAnchorSide,
  calculateCenteredShapePosition,
} from './quickSpawnConnectedShape'

describe('quickSpawnConnectedShape', () => {
  it('calcule correctement les côtés opposés canoniques', () => {
    expect(getOppositeAnchorSide('right')).toBe('left')
    expect(getOppositeAnchorSide('left')).toBe('right')
    expect(getOppositeAnchorSide('top')).toBe('bottom')
    expect(getOppositeAnchorSide('bottom')).toBe('top')
    expect(getOppositeAnchorSide('auto')).toBe('auto')
    expect(getOppositeAnchorSide(null)).toBe('auto')
  })

  it('calcule le centrage spatial selon le type de forme', () => {
    // Rectangle 140x68
    const rectPos = calculateCenteredShapePosition('rectangle', { x: 300, y: 200 })
    expect(rectPos).toEqual({ x: 230, y: 166 })

    // Circle 130x130
    const circlePos = calculateCenteredShapePosition('circle', { x: 300, y: 200 })
    expect(circlePos).toEqual({ x: 235, y: 135 })
  })

  it('insère de manière atomique la forme et le connecteur dans le code source .nanko', () => {
    const initialDsl = `rectangle gateway label="Gateway"

!LAYOUT
gateway: x=50, y=100
!END
`

    const result = quickSpawnConnectedShape({
      sourceCode: initialDsl,
      sourceNodeId: 'gateway',
      sourceHandle: 'right',
      shapeType: 'rectangle',
      cursorPosition: { x: 350, y: 100 },
    })

    expect(result.newShapeId).toBe('rect_1')
    // Déclaration de la nouvelle forme présente
    expect(result.newSourceCode).toContain('rectangle rect_1 label="Rectangle 1"')
    // Connecteur inséré
    expect(result.newSourceCode).toContain('gateway -> rect_1')
    // Layout positionné et centré (350-70=280, 100-34=66)
    expect(result.newSourceCode).toMatch(/rect_1:\s*x=280,\s*y=66/)
    // Layout du connecteur avec from=right, to=left
    expect(result.newSourceCode).toMatch(/gateway->rect_1:\s*from=right,\s*to=left/)
  })

  it('gère le cas d un départ auto sans ancres cardinales forcées', () => {
    const initialDsl = `circle core label="Core"

!LAYOUT
core: x=100, y=100
!END
`

    const result = quickSpawnConnectedShape({
      sourceCode: initialDsl,
      sourceNodeId: 'core',
      sourceHandle: 'auto',
      shapeType: 'circle',
      cursorPosition: { x: 300, y: 300 },
    })

    expect(result.newShapeId).toBe('circle_1')
    expect(result.newSourceCode).toContain('circle circle_1 label="Circle 1"')
    expect(result.newSourceCode).toContain('core -> circle_1')
    // Pas de from/to imposé dans !LAYOUT pour du auto pur
    expect(result.newSourceCode).not.toContain('core->circle_1: from=')
  })
})

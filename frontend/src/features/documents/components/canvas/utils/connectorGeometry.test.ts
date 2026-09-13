import { describe, it, expect } from 'vitest'
import { getOptimalConnectorSides, isCardinalSide } from './connectorGeometry'

describe('connectorGeometry', () => {
  const sourceBounds = { x: 0, y: 0, width: 100, height: 60 }

  it('valide correctement les côtés cardinaux avec isCardinalSide', () => {
    expect(isCardinalSide('top')).toBe(true)
    expect(isCardinalSide('bottom')).toBe(true)
    expect(isCardinalSide('left')).toBe(true)
    expect(isCardinalSide('right')).toBe(true)
    expect(isCardinalSide('auto')).toBe(false)
    expect(isCardinalSide(undefined)).toBe(false)
    expect(isCardinalSide(null)).toBe(false)
    expect(isCardinalSide('invalid')).toBe(false)
  })

  it('préserve les ancres fixes lorsque les deux côtés sont cardinaux', () => {
    const targetBounds = { x: 200, y: 0, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'top', 'bottom')
    expect(res).toEqual({ sourceSide: 'top', targetSide: 'bottom' })
  })

  it('calcule les faces optimales lorsque les deux côtés sont auto (horizontal droite)', () => {
    const targetBounds = { x: 300, y: 0, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'auto', 'auto')
    expect(res).toEqual({ sourceSide: 'right', targetSide: 'left' })
  })

  it('calcule les faces optimales lorsque les deux côtés sont auto (horizontal gauche)', () => {
    const targetBounds = { x: -300, y: 0, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'auto', 'auto')
    expect(res).toEqual({ sourceSide: 'left', targetSide: 'right' })
  })

  it('calcule les faces optimales lorsque les deux côtés sont auto (vertical bas)', () => {
    const targetBounds = { x: 0, y: 200, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'auto', 'auto')
    expect(res).toEqual({ sourceSide: 'bottom', targetSide: 'top' })
  })

  it('calcule les faces optimales lorsque les deux côtés sont auto (vertical haut)', () => {
    const targetBounds = { x: 0, y: -200, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'auto', 'auto')
    expect(res).toEqual({ sourceSide: 'top', targetSide: 'bottom' })
  })

  it('gère une ancre source fixe et une cible auto', () => {
    const targetBounds = { x: 0, y: -200, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'top', 'auto')
    expect(res.sourceSide).toBe('top')
    expect(res.targetSide).toBe('bottom')
  })

  it('gère une ancre source auto et une cible fixe', () => {
    const targetBounds = { x: 300, y: 0, width: 100, height: 60 }
    const res = getOptimalConnectorSides(sourceBounds, targetBounds, 'auto', 'left')
    expect(res.sourceSide).toBe('right')
    expect(res.targetSide).toBe('left')
  })
})

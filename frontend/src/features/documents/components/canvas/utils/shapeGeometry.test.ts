import { describe, it, expect } from 'vitest'
import { getPerimeterContact } from './shapeGeometry'

describe('shapeGeometry (INV-7)', () => {
  describe('Rectangle and default shapes', () => {
    it('returns direct slot coordinates on left edge', () => {
      const contact = getPerimeterContact('left', 25, 'rectangle')
      expect(contact).toEqual({ xPercentage: 0, yPercentage: 25 })
    })

    it('returns direct slot coordinates on right edge', () => {
      const contact = getPerimeterContact('right', 75, 'rectangle')
      expect(contact).toEqual({ xPercentage: 100, yPercentage: 75 })
    })

    it('returns direct slot coordinates on top edge', () => {
      const contact = getPerimeterContact('top', 33, 'rectangle')
      expect(contact).toEqual({ xPercentage: 33, yPercentage: 0 })
    })

    it('returns direct slot coordinates on bottom edge', () => {
      const contact = getPerimeterContact('bottom', 66, 'rectangle')
      expect(contact).toEqual({ xPercentage: 66, yPercentage: 100 })
    })
  })

  describe('Circle shape (360° perimeter calculation)', () => {
    it('returns exact cardinal tangency at 50% on all 4 flanks', () => {
      // Left cardinal pole: (0%, 50%)
      const leftPole = getPerimeterContact('left', 50, 'circle')
      expect(leftPole.xPercentage).toBeCloseTo(0, 5)
      expect(leftPole.yPercentage).toBe(50)

      // Right cardinal pole: (100%, 50%)
      const rightPole = getPerimeterContact('right', 50, 'circle')
      expect(rightPole.xPercentage).toBeCloseTo(100, 5)
      expect(rightPole.yPercentage).toBe(50)

      // Top cardinal pole: (50%, 0%)
      const topPole = getPerimeterContact('top', 50, 'circle')
      expect(topPole.xPercentage).toBe(50)
      expect(topPole.yPercentage).toBeCloseTo(0, 5)

      // Bottom cardinal pole: (50%, 100%)
      const bottomPole = getPerimeterContact('bottom', 50, 'circle')
      expect(bottomPole.xPercentage).toBe(50)
      expect(bottomPole.yPercentage).toBeCloseTo(100, 5)
    })

    it('calculates perimeter arc on left flank with intermediate offset', () => {
      // y = 20% -> yDelta = -30 -> xOffset = sqrt(2500 - 900) = sqrt(1600) = 40 -> x = 50 - 40 = 10%
      const contact = getPerimeterContact('left', 20, 'circle')
      expect(contact.xPercentage).toBeCloseTo(10, 5)
      expect(contact.yPercentage).toBe(20)
    })

    it('calculates perimeter arc on right flank with intermediate offset', () => {
      // y = 80% -> yDelta = +30 -> xOffset = 40 -> x = 50 + 40 = 90%
      const contact = getPerimeterContact('right', 80, 'circle')
      expect(contact.xPercentage).toBeCloseTo(90, 5)
      expect(contact.yPercentage).toBe(80)
    })

    it('calculates perimeter arc on top flank with intermediate offset', () => {
      // x = 20% -> xDelta = -30 -> yOffset = 40 -> y = 50 - 40 = 10%
      const contact = getPerimeterContact('top', 20, 'circle')
      expect(contact.xPercentage).toBe(20)
      expect(contact.yPercentage).toBeCloseTo(10, 5)
    })

    it('calculates perimeter arc on bottom flank with intermediate offset', () => {
      // x = 80% -> xDelta = +30 -> yOffset = 40 -> y = 50 + 40 = 90%
      const contact = getPerimeterContact('bottom', 80, 'circle')
      expect(contact.xPercentage).toBe(80)
      expect(contact.yPercentage).toBeCloseTo(90, 5)
    })

    it('clips cleanly at extreme corners without NaN', () => {
      const contact0 = getPerimeterContact('left', 0, 'circle')
      expect(contact0.xPercentage).toBeCloseTo(50, 5)
      expect(contact0.yPercentage).toBe(0)

      const contact100 = getPerimeterContact('bottom', 100, 'circle')
      expect(contact100.xPercentage).toBe(100)
      expect(contact100.yPercentage).toBeCloseTo(50, 5)
    })
  })
})

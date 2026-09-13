import { describe, it, expect } from 'vitest'
import { getPerimeterContact } from './shapeGeometry'

describe('shapeGeometry (INV-7)', () => {
  describe('Rectangle and default shapes', () => {
    it('returns direct slot coordinates on left edge with zero delta', () => {
      const contact = getPerimeterContact('left', 25, 'rectangle')
      expect(contact.boxXPercentage).toBe(0)
      expect(contact.boxYPercentage).toBe(25)
      expect(contact.perimeterXPercentage).toBe(0)
      expect(contact.perimeterYPercentage).toBe(25)
      expect(contact.deltaXPercentage).toBe(0)
      expect(contact.deltaYPercentage).toBe(0)
    })

    it('returns direct slot coordinates on right edge with zero delta', () => {
      const contact = getPerimeterContact('right', 75, 'rectangle')
      expect(contact.boxXPercentage).toBe(100)
      expect(contact.boxYPercentage).toBe(75)
      expect(contact.perimeterXPercentage).toBe(100)
      expect(contact.perimeterYPercentage).toBe(75)
      expect(contact.deltaXPercentage).toBe(0)
      expect(contact.deltaYPercentage).toBe(0)
    })

    it('returns direct slot coordinates on top edge with zero delta', () => {
      const contact = getPerimeterContact('top', 33, 'rectangle')
      expect(contact.boxXPercentage).toBe(33)
      expect(contact.boxYPercentage).toBe(0)
      expect(contact.perimeterXPercentage).toBe(33)
      expect(contact.perimeterYPercentage).toBe(0)
      expect(contact.deltaXPercentage).toBe(0)
      expect(contact.deltaYPercentage).toBe(0)
    })

    it('returns direct slot coordinates on bottom edge with zero delta', () => {
      const contact = getPerimeterContact('bottom', 66, 'rectangle')
      expect(contact.boxXPercentage).toBe(66)
      expect(contact.boxYPercentage).toBe(100)
      expect(contact.perimeterXPercentage).toBe(66)
      expect(contact.perimeterYPercentage).toBe(100)
      expect(contact.deltaXPercentage).toBe(0)
      expect(contact.deltaYPercentage).toBe(0)
    })
  })

  describe('Circle shape (center-oriented perimeter calculation)', () => {
    it('returns exact cardinal tangency at 50% on all 4 flanks with zero delta', () => {
      // Left cardinal pole: (0%, 50%)
      const leftPole = getPerimeterContact('left', 50, 'circle')
      expect(leftPole.perimeterXPercentage).toBe(0)
      expect(leftPole.perimeterYPercentage).toBe(50)
      expect(leftPole.deltaXPercentage).toBe(0)
      expect(leftPole.deltaYPercentage).toBe(0)

      // Right cardinal pole: (100%, 50%)
      const rightPole = getPerimeterContact('right', 50, 'circle')
      expect(rightPole.perimeterXPercentage).toBe(100)
      expect(rightPole.perimeterYPercentage).toBe(50)
      expect(rightPole.deltaXPercentage).toBe(0)
      expect(rightPole.deltaYPercentage).toBe(0)

      // Top cardinal pole: (50%, 0%)
      const topPole = getPerimeterContact('top', 50, 'circle')
      expect(topPole.perimeterXPercentage).toBe(50)
      expect(topPole.perimeterYPercentage).toBe(0)
      expect(topPole.deltaXPercentage).toBe(0)
      expect(topPole.deltaYPercentage).toBe(0)

      // Bottom cardinal pole: (50%, 100%)
      const bottomPole = getPerimeterContact('bottom', 50, 'circle')
      expect(bottomPole.perimeterXPercentage).toBe(50)
      expect(bottomPole.perimeterYPercentage).toBe(100)
      expect(bottomPole.deltaXPercentage).toBe(0)
      expect(bottomPole.deltaYPercentage).toBe(0)
    })

    it('orients towards center (50%, 50%) on right flank with offset 25%', () => {
      // P_box = (100, 25). Vector to center: (50 - 100, 50 - 25) = (-50, +25)
      // L = sqrt(2500 + 625) = sqrt(3125) ~= 55.9017
      // P_contact: x = 50 + 50*(50/55.9017) ~= 94.7214, y = 50 + 50*(-25/55.9017) ~= 27.6393
      const contact = getPerimeterContact('right', 25, 'circle')
      expect(contact.boxXPercentage).toBe(100)
      expect(contact.boxYPercentage).toBe(25)
      expect(contact.perimeterXPercentage).toBeCloseTo(94.7214, 3)
      expect(contact.perimeterYPercentage).toBeCloseTo(27.6393, 3)

      // Le vecteur de décalage doit avoir la même pente que la visée vers le centre
      const slopeDelta = contact.deltaYPercentage / contact.deltaXPercentage
      const slopeToCenter = (50 - 25) / (50 - 100) // 25 / -50 = -0.5
      expect(slopeDelta).toBeCloseTo(slopeToCenter, 4)

      // Le point doit être exactement sur le cercle (R = 50%)
      const distFromCenter = Math.hypot(contact.perimeterXPercentage - 50, contact.perimeterYPercentage - 50)
      expect(distFromCenter).toBeCloseTo(50, 4)
    })

    it('orients towards center on left flank with offset 75%', () => {
      // P_box = (0, 75). Vector to center: (50 - 0, 50 - 75) = (+50, -25)
      const contact = getPerimeterContact('left', 75, 'circle')
      expect(contact.boxXPercentage).toBe(0)
      expect(contact.boxYPercentage).toBe(75)
      expect(contact.perimeterXPercentage).toBeCloseTo(5.2786, 3)
      expect(contact.perimeterYPercentage).toBeCloseTo(72.3607, 3)

      const slopeDelta = contact.deltaYPercentage / contact.deltaXPercentage
      const slopeToCenter = (50 - 75) / (50 - 0) // -25 / 50 = -0.5
      expect(slopeDelta).toBeCloseTo(slopeToCenter, 4)

      const distFromCenter = Math.hypot(contact.perimeterXPercentage - 50, contact.perimeterYPercentage - 50)
      expect(distFromCenter).toBeCloseTo(50, 4)
    })

    it('orients towards center on top flank with offset 25%', () => {
      // P_box = (25, 0). Vector to center: (50 - 25, 50 - 0) = (+25, +50)
      const contact = getPerimeterContact('top', 25, 'circle')
      expect(contact.boxXPercentage).toBe(25)
      expect(contact.boxYPercentage).toBe(0)
      expect(contact.perimeterXPercentage).toBeCloseTo(27.6393, 3)
      expect(contact.perimeterYPercentage).toBeCloseTo(5.2786, 3)

      const slopeDelta = contact.deltaYPercentage / contact.deltaXPercentage
      const slopeToCenter = (50 - 0) / (50 - 25) // 50 / 25 = 2
      expect(slopeDelta).toBeCloseTo(slopeToCenter, 4)

      const distFromCenter = Math.hypot(contact.perimeterXPercentage - 50, contact.perimeterYPercentage - 50)
      expect(distFromCenter).toBeCloseTo(50, 4)
    })

    it('orients towards center on bottom flank with offset 75%', () => {
      // P_box = (75, 100). Vector to center: (50 - 75, 50 - 100) = (-25, -50)
      const contact = getPerimeterContact('bottom', 75, 'circle')
      expect(contact.boxXPercentage).toBe(75)
      expect(contact.boxYPercentage).toBe(100)
      expect(contact.perimeterXPercentage).toBeCloseTo(72.3607, 3)
      expect(contact.perimeterYPercentage).toBeCloseTo(94.7214, 3)

      const slopeDelta = contact.deltaYPercentage / contact.deltaXPercentage
      const slopeToCenter = (50 - 100) / (50 - 75) // -50 / -25 = 2
      expect(slopeDelta).toBeCloseTo(slopeToCenter, 4)

      const distFromCenter = Math.hypot(contact.perimeterXPercentage - 50, contact.perimeterYPercentage - 50)
      expect(distFromCenter).toBeCloseTo(50, 4)
    })

    it('projects corner slots at 45 degree diagonals cleanly on circle perimeter', () => {
      const contactCorner = getPerimeterContact('left', 0, 'circle')
      expect(contactCorner.boxXPercentage).toBe(0)
      expect(contactCorner.boxYPercentage).toBe(0)
      // 50 - 50/sqrt(2) ~= 14.6447
      expect(contactCorner.perimeterXPercentage).toBeCloseTo(14.6447, 3)
      expect(contactCorner.perimeterYPercentage).toBeCloseTo(14.6447, 3)

      const dist = Math.hypot(contactCorner.perimeterXPercentage - 50, contactCorner.perimeterYPercentage - 50)
      expect(dist).toBeCloseTo(50, 4)
    })
  })
})

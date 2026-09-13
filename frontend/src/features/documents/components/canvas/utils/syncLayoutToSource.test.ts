import { describe, it, expect } from 'vitest'
import {
  updateNankoSourceLayout,
  updateNankoSourceBulkLayout,
  updateNankoSourceEdgeLayout,
  updateNankoSourceEdgeLabelPosition,
} from './syncLayoutToSource'

describe('syncLayoutToSource', () => {
  describe('updateNankoSourceLayout', () => {
    it('insère la section !LAYOUT si elle est absente', () => {
      const code = 'rectangle api label="API Gateway"\ncircle db label="PostgreSQL"'
      const updated = updateNankoSourceLayout(code, 'api', { x: 120.4, y: 80.6 })

      expect(updated).toContain('!LAYOUT\napi: x=120, y=81\n!END')
      expect(updated.startsWith(code)).toBe(true)
    })

    it("met à jour la ligne d'un nœud existant dans !LAYOUT", () => {
      const code = [
        'rectangle api label="API Gateway"',
        '!LAYOUT',
        'api: x=100, y=100',
        'db: x=300, y=200',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceLayout(code, 'api', { x: 250, y: 150 })

      expect(updated).toContain('api: x=250, y=150')
      expect(updated).toContain('db: x=300, y=200')
      expect(updated).not.toContain('api: x=100, y=100')
    })

    it('ajoute un nouveau nœud dans un !LAYOUT existant', () => {
      const code = [
        'rectangle api label="API Gateway"',
        'circle db label="Database"',
        '!LAYOUT',
        'api: x=100, y=100',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceLayout(code, 'db', { x: 400, y: 100 })

      expect(updated).toContain('api: x=100, y=100')
      expect(updated).toContain('db: x=400, y=100')
    })
  })

  describe('updateNankoSourceBulkLayout', () => {
    it('génère un bloc !LAYOUT complet pour plusieurs nœuds', () => {
      const code = 'rectangle front label="Front"\nrectangle api label="API"'
      const layout = {
        front: { x: 100, y: 100 },
        api: { x: 350, y: 100 },
      }

      const updated = updateNankoSourceBulkLayout(code, layout)
      expect(updated).toContain('!LAYOUT\napi: x=350, y=100\nfront: x=100, y=100\n!END')
    })

    it('remplace complètement un bloc !LAYOUT existant', () => {
      const code = [
        'rectangle front label="Front"',
        '!LAYOUT',
        'old: x=1, y=2',
        '!END',
      ].join('\n')

      const layout = {
        front: { x: 150, y: 250 },
      }

      const updated = updateNankoSourceBulkLayout(code, layout)
      expect(updated).toContain('!LAYOUT\nfront: x=150, y=250\n!END')
      expect(updated).not.toContain('old: x=1, y=2')
    })

    it('préserve les entrées de connecteurs existantes dans !LAYOUT', () => {
      const code = [
        'rectangle front label="Front"',
        '!LAYOUT',
        'front: x=1, y=2',
        'front->back: from=top, to=left',
        '!END',
      ].join('\n')

      const layout = {
        front: { x: 150, y: 250 },
      }

      const updated = updateNankoSourceBulkLayout(code, layout)
      expect(updated).toContain('front: x=150, y=250')
      expect(updated).toContain('front->back: from=top, to=left')
    })
  })

  describe('updateNankoSourceEdgeLayout', () => {
    it('ajoute une ancre d arête dans un !LAYOUT existant', () => {
      const code = [
        'rectangle a label="A"',
        'rectangle b label="B"',
        'a -> b',
        '!LAYOUT',
        'a: x=10, y=20',
        'b: x=100, y=200',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLayout(code, 'a', 'b', { from: 'top', to: 'bottom' })
      expect(updated).toContain('a->b: from=top, to=bottom')
    })

    it('met à jour une ancre d arête existante', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a->b: from=top, to=left',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLayout(code, 'a', 'b', { from: 'bottom', to: 'right' })
      expect(updated).toContain('a->b: from=bottom, to=right')
      expect(updated).not.toContain('from=top')
    })

    it('retire la ligne si les deux côtés deviennent auto', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a: x=10, y=20',
        'a->b: from=top, to=left',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLayout(code, 'a', 'b', { from: 'auto', to: 'auto' })
      expect(updated).not.toContain('a->b:')
      expect(updated).toContain('a: x=10, y=20')
    })

    it('préserve labelX et labelY lors de la mise à jour des ancres', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a->b: from=top, to=left, labelX=150, labelY=80',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLayout(code, 'a', 'b', { from: 'bottom', to: 'right' })
      expect(updated).toContain('a->b: from=bottom, to=right, labelX=150, labelY=80')
    })
  })

  describe('updateNankoSourceEdgeLabelPosition', () => {
    it('insère la section !LAYOUT et les coordonnées de label si absentes', () => {
      const code = 'rectangle a label="A"\nrectangle b label="B"\na -> b label="Link"'
      const updated = updateNankoSourceEdgeLabelPosition(code, 'a', 'b', { x: 140.2, y: 75.8 })

      expect(updated).toContain('!LAYOUT\na->b: labelX=140, labelY=76\n!END')
    })

    it('ajoute labelX et labelY à une arête existante sans ancres', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a: x=10, y=20',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLabelPosition(code, 'a', 'b', { x: 200, y: 150 })
      expect(updated).toContain('a->b: labelX=200, labelY=150')
      expect(updated).toContain('a: x=10, y=20')
    })

    it('met à jour labelX et labelY en préservant from et to existants', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a->b: from=top, to=right, labelX=100, labelY=50',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLabelPosition(code, 'a', 'b', { x: 220, y: 90 })
      expect(updated).toContain('a->b: from=top, to=right, labelX=220, labelY=90')
      expect(updated).not.toContain('labelX=100')
    })

    it('retire labelX et labelY quand coords est null tout en préservant from et to', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a->b: from=left, to=bottom, labelX=120, labelY=40',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLabelPosition(code, 'a', 'b', null)
      expect(updated).toContain('a->b: from=left, to=bottom')
      expect(updated).not.toContain('labelX=')
      expect(updated).not.toContain('labelY=')
    })

    it('supprime la ligne d arête si aucun autre attribut ne subsiste lors du reset', () => {
      const code = [
        'rectangle a label="A"',
        '!LAYOUT',
        'a: x=10, y=20',
        'a->b: labelX=120, labelY=40',
        '!END',
      ].join('\n')

      const updated = updateNankoSourceEdgeLabelPosition(code, 'a', 'b', null)
      expect(updated).not.toContain('a->b:')
      expect(updated).toContain('a: x=10, y=20')
    })
  })
})

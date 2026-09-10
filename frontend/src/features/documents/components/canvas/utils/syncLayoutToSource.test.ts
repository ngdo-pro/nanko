import { describe, it, expect } from 'vitest'
import { updateNankoSourceLayout, updateNankoSourceBulkLayout } from './syncLayoutToSource'

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
  })
})

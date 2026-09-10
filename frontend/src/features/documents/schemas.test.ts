import { describe, it, expect } from 'vitest'
import {
  createDocumentSchema,
  updateDocumentSchema,
  nankoAstSchema,
  documentDetailSchema,
  documentListItemSchema,
  documentsListResponseSchema,
} from './schemas'

describe('Documents Schemas', () => {
  describe('createDocumentSchema', () => {
    it('valide un payload correct avec layer par défaut à 0', () => {
      const result = createDocumentSchema.safeParse({
        name: 'Architecture Globale',
        slug: 'architecture-globale',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.layer).toBe(0)
      }
    })

    it('valide un payload avec un layer explicite', () => {
      const result = createDocumentSchema.safeParse({
        name: 'Composant Auth',
        slug: 'composant-auth',
        layer: 2,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.layer).toBe(2)
      }
    })

    it('rejette un nom trop court', () => {
      const result = createDocumentSchema.safeParse({
        name: 'A',
        slug: 'doc-slug',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('au moins 2 caractères')
      }
    })

    it('rejette un slug avec des caractères non autorisés', () => {
      const result = createDocumentSchema.safeParse({
        name: 'Mon Document',
        slug: 'Doc_Slug!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('minuscules, chiffres et tirets')
      }
    })
  })

  describe('updateDocumentSchema', () => {
    it('valide un payload de mise à jour de code source', () => {
      const result = updateDocumentSchema.safeParse({
        sourceCode: 'rectangle app "App"\ncircle db "DB"\napp -> db "requête"',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('nankoAstSchema', () => {
    it('valide un AST complet avec shapes, connectors, desc, dslVersion et layout', () => {
      const result = nankoAstSchema.safeParse({
        dslVersion: 1,
        shapes: [
          { id: 'app', type: 'rectangle', label: 'App', desc: 'Application principale' },
          { id: 'db', type: 'circle', label: 'DB', desc: null },
        ],
        connectors: [
          { source: 'app', target: 'db', label: 'requête', desc: 'Requêtes SQL' },
        ],
        layout: {
          app: { x: 100, y: 100 },
          db: { x: 300, y: 100 },
        },
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dslVersion).toBe(1)
        expect(result.data.shapes).toHaveLength(2)
        expect(result.data.shapes[0]?.desc).toBe('Application principale')
        expect(result.data.connectors).toHaveLength(1)
        expect(result.data.connectors[0]?.label).toBe('requête')
        expect(result.data.connectors[0]?.desc).toBe('Requêtes SQL')
      }
    })

    it('fournit des valeurs par défaut pour un AST vide', () => {
      const result = nankoAstSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dslVersion).toBe(1)
        expect(result.data.shapes).toEqual([])
        expect(result.data.connectors).toEqual([])
        expect(result.data.layout).toEqual({})
      }
    })

    it('tolère un tableau vide pour layout et le transforme en objet vide', () => {
      const result = nankoAstSchema.safeParse({
        shapes: [],
        connectors: [],
        layout: [],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.layout).toEqual({})
      }
    })
  })

  describe('documentDetailSchema', () => {
    it('valide un document complet retourné par l API', () => {
      const doc = {
        id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f999',
        projectId: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
        name: 'Mon Document',
        slug: 'mon-document',
        layer: 0,
        sourceCode: 'rectangle api "API"',
        ast: {
          shapes: [{ id: 'api', type: 'rectangle', label: 'API' }],
          connectors: [],
          layout: {},
        },
        createdAt: '2026-09-06T12:00:00Z',
        updatedAt: '2026-09-06T12:00:00Z',
      }

      const result = documentDetailSchema.safeParse(doc)
      expect(result.success).toBe(true)
    })
  })

  describe('documentListItemSchema & documentsListResponseSchema', () => {
    it('valide une liste de documents synthétiques', () => {
      const list = [
        {
          id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f999',
          projectId: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
          name: 'Mon Document',
          slug: 'mon-document',
          layer: 0,
          shapesCount: 3,
          connectorsCount: 2,
          createdAt: '2026-09-06T12:00:00Z',
          updatedAt: '2026-09-06T12:00:00Z',
        },
      ]

      const itemResult = documentListItemSchema.safeParse(list[0])
      expect(itemResult.success).toBe(true)

      const listResult = documentsListResponseSchema.safeParse(list)
      expect(listResult.success).toBe(true)
      if (listResult.success) {
        expect(listResult.data).toHaveLength(1)
      }
    })
  })
})

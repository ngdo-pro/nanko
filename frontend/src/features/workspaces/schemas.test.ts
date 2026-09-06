import { describe, it, expect } from 'vitest'
import { createProjectSchema, organisationSchema, projectSchema } from './schemas'

describe('Workspaces Schemas', () => {
  describe('createProjectSchema', () => {
    it('valide un payload correct', () => {
      const result = createProjectSchema.safeParse({
        name: 'Architecture E-Commerce',
        slug: 'architecture-ecommerce',
      })
      expect(result.success).toBe(true)
    })

    it('rejette un nom trop court (< 2 caractères)', () => {
      const result = createProjectSchema.safeParse({
        name: 'A',
        slug: 'valid-slug',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('au moins 2 caractères')
      }
    })

    it('rejette un slug invalide (majuscules ou caractères spéciaux)', () => {
      const result = createProjectSchema.safeParse({
        name: 'Mon Projet',
        slug: 'Invalid Slug!',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('minuscules, chiffres et tirets')
      }
    })
  })

  describe('organisationSchema & projectSchema', () => {
    it('valide un projet individuel', () => {
      const projectData = {
        id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
        organisationId: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
        name: 'Mon premier projet',
        slug: 'mon-premier-projet',
        createdAt: '2026-09-06T12:00:00Z',
      }
      const parsed = projectSchema.safeParse(projectData)
      expect(parsed.success).toBe(true)
    })

    it('valide une organisation complète avec ses projets', () => {
      const payload = {
        id: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
        name: 'Espace personnel',
        slug: 'personal-0191c0a1',
        isPersonal: true,
        role: 'owner',
        createdAt: '2026-09-06T12:00:00Z',
        projects: [
          {
            id: '0191c0a1-9a1c-7f88-82bc-3e2c1d45f678',
            organisationId: '0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567',
            name: 'Mon premier projet',
            slug: 'mon-premier-projet',
            createdAt: '2026-09-06T12:00:00Z',
          },
        ],
      }
      const parsed = organisationSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
    })
  })
})

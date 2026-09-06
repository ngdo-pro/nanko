import { describe, it, expect } from 'vitest'
import { userProfileSchema } from './schemas'

describe('userProfileSchema', () => {
  it('valide avec succès un profil utilisateur conforme', () => {
    const validData = {
      id: '0191c280-496a-7312-bf91-a1b2c3d4e5f6',
      keycloakId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      email: 'architect@nanko.dev',
      createdAt: '2026-09-05T08:00:00.000Z',
    }

    const result = userProfileSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('architect@nanko.dev')
      expect(result.data.id).toBe(validData.id)
    }
  })

  it('rejette un profil avec un format email invalide', () => {
    const invalidData = {
      id: '0191c280-496a-7312-bf91-a1b2c3d4e5f6',
      keycloakId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      email: 'invalid-email-address',
      createdAt: '2026-09-05T08:00:00.000Z',
    }

    const result = userProfileSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('rejette un profil avec un ID qui n est pas un UUID', () => {
    const invalidData = {
      id: 'not-a-uuid',
      keycloakId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      email: 'architect@nanko.dev',
      createdAt: '2026-09-05T08:00:00.000Z',
    }

    const result = userProfileSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('rejette un profil avec une date createdAt invalide', () => {
    const invalidData = {
      id: '0191c280-496a-7312-bf91-a1b2c3d4e5f6',
      keycloakId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      email: 'architect@nanko.dev',
      createdAt: 'hier',
    }

    const result = userProfileSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

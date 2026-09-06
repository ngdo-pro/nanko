import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUserProfile } from './getUser'
import * as apiClientModule from '@/lib/api-client'

vi.mock('@/lib/api-client')

describe('fetchUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('valide et retourne le profil utilisateur via Zod', async () => {
    const mockData = {
      id: '0191c280-496a-7312-bf91-a1b2c3d4e5f6',
      keycloakId: 'user-kc-id',
      email: 'dev@nanko.dev',
      createdAt: '2026-09-05T12:00:00.000Z',
    }

    vi.mocked(apiClientModule.apiClient).mockResolvedValue(mockData)

    const profile = await fetchUserProfile()
    expect(profile).toEqual(mockData)
    expect(apiClientModule.apiClient).toHaveBeenCalledWith('/api/v1/me')
  })

  it('rejette l appel si le format de données retourné est invalide', async () => {
    const invalidData = {
      id: 'not-a-uuid',
      email: 'not-an-email',
    }

    vi.mocked(apiClientModule.apiClient).mockResolvedValue(invalidData)

    await expect(fetchUserProfile()).rejects.toThrow()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from './api-client'
import { keycloak } from './keycloak'
import { ApiError } from '@/types/api'

vi.mock('./keycloak', () => ({
  keycloak: {
    authenticated: false,
    token: null,
    updateToken: vi.fn().mockResolvedValue(true),
  },
}))

describe('apiClient', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('injecte le header Authorization en présence d un token valide et ajoute traceparent', async () => {
    keycloak.authenticated = true
    keycloak.token = 'valid-jwt-token'

    let capturedHeaders: Headers | undefined

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return Promise.resolve(
        new Response(JSON.stringify({ id: '123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    const result = await apiClient<{ id: string }>('/api/v1/me')

    expect(result).toEqual({ id: '123' })
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer valid-jwt-token')
    expect(capturedHeaders?.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  it('convertit les erreurs HTTP en instances d ApiError', async () => {
    keycloak.authenticated = false
    keycloak.token = undefined

    const errorPayload = {
      violations: [{ propertyPath: 'email', title: 'Email invalide' }],
    }

    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(errorPayload), {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiClient('/api/v1/test')).rejects.toThrow(ApiError)

    try {
      await apiClient('/api/v1/test')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(422)
      expect(apiErr.data).toEqual(errorPayload)
    }
  })

  it('gère correctement le code HTTP 204 No Content', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        statusText: 'No Content',
      }),
    )

    const result = await apiClient('/api/v1/empty')
    expect(result).toEqual({})
  })
})

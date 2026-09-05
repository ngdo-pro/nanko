import { keycloak } from './keycloak'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:48000'

export async function fetchWithAuth(input: string, init: RequestInit = {}): Promise<Response> {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30)
    } catch {
      await keycloak.login()
      throw new Error('Session expirée, redirection vers la page de connexion.')
    }
  }

  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`
  const headers = new Headers(init.headers)

  if (keycloak.token) {
    headers.set('Authorization', `Bearer ${keycloak.token}`)
  }

  return fetch(url, {
    ...init,
    headers,
  })
}

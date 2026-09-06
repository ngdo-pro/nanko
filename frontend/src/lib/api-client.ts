import { env } from '@/config/env'
import { keycloak } from './keycloak'
import { injectTraceContext } from '@/config/telemetry'
import { ApiError, type ApiErrorResponse } from '@/types/api'
import { queryClient } from './react-query'

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { params, headers: customHeaders, ...restOptions } = options

  // 1. Construction URL avec query parameters
  const baseUrl = env.api.baseUrl
  const url = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val))
  }

  // 2. Headers par défaut et Bearer Token Keycloak
  const headers = new Headers(customHeaders)
  if (!headers.has('Content-Type') && restOptions.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (keycloak.authenticated && keycloak.token) {
    try {
      await keycloak.updateToken(30)
    } catch {
      // Échec de refresh préventif silencieux, on tente avec le token actuel
    }
    if (keycloak.token) {
      headers.set('Authorization', `Bearer ${keycloak.token}`)
    }
  }

  // 3. Injection OpenTelemetry W3C Trace Context
  injectTraceContext(headers)

  // 4. Exécution de la requête
  const response = await fetch(url.toString(), {
    ...restOptions,
    headers,
  })

  // 5. Gestion de l'expiration du token (401)
  if (response.status === 401 && !isRetry && keycloak.authenticated) {
    try {
      const refreshed = await keycloak.updateToken(30)
      if (refreshed) {
        return apiClient<T>(endpoint, options, true)
      }
    } catch {
      queryClient.clear()
    }
  }

  // 6. Gestion standardisée des retours d'erreur
  if (!response.ok) {
    let errorData: ApiErrorResponse | undefined
    try {
      errorData = (await response.json()) as ApiErrorResponse
    } catch {
      errorData = { code: 'HTTP_ERROR', message: response.statusText }
    }
    throw new ApiError(response.status, errorData)
  }

  // 7. Parsing du payload de succès
  if (response.status === 204) {
    return {} as T
  }
  return response.json() as Promise<T>
}

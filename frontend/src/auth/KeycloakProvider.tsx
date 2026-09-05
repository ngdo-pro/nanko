import { useEffect, useState, useRef, type ReactNode } from 'react'
import { keycloak } from './keycloak'
import { fetchWithAuth } from './httpClient'
import { AuthContext } from './context'
import type { AuthContextType, UserProfile } from './types'

interface KeycloakProviderProps {
  children: ReactNode
}

export function KeycloakProvider({ children }: KeycloakProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const isInitializing = useRef(false)

  useEffect(() => {
    if (isInitializing.current) return
    isInitializing.current = true

    keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then(async (authenticated) => {
        setIsAuthenticated(authenticated)
        if (authenticated && keycloak.token) {
          setToken(keycloak.token)
          const parsed = keycloak.tokenParsed as { email?: string; preferred_username?: string; sub?: string } | undefined
          if (parsed) {
            setUser({
              id: parsed.sub ?? '',
              keycloakId: parsed.sub ?? '',
              email: parsed.email || parsed.preferred_username || '',
              createdAt: new Date().toISOString(),
            })
          }
          try {
            const res = await fetchWithAuth('/api/v1/me')
            if (res.ok) {
              const profile = (await res.json()) as UserProfile
              setUser(profile)
            }
          } catch {
            // Profil non récupérable immédiatement
          }
        }
      })
      .catch((err) => {
        // En cas d'erreur réseau vers Keycloak en local
        console.error('Erreur initialisation Keycloak', err)
      })
      .finally(() => {
        setIsLoading(false)
      })

    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed && keycloak.token) {
            setToken(keycloak.token)
          }
        })
        .catch(() => {
          setIsAuthenticated(false)
          setUser(null)
          setToken(null)
        })
    }
  }, [])

  const login = async () => {
    await keycloak.login()
  }

  const logout = async () => {
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    await keycloak.logout({ redirectUri: window.location.origin })
  }

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    token,
    user,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

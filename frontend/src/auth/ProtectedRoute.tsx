import { useEffect, type ReactNode } from 'react'
import { useAuth } from './useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void login()
    }
  }, [isLoading, isAuthenticated, login])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Chargement de la session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

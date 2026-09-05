import { useContext } from 'react'
import { AuthContext } from './context'
import type { AuthContextType } from './types'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un KeycloakProvider')
  }
  return context
}

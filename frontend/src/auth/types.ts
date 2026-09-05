export interface UserProfile {
  id: string
  keycloakId: string
  email: string
  createdAt: string
}

export interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  user: UserProfile | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

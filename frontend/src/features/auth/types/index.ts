import { z } from 'zod'

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  keycloakId: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
})

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>

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

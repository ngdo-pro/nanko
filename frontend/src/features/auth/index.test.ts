import { describe, it, expect } from 'vitest'
import * as authExports from './index'

describe('features/auth barrel export', () => {
  it('expose uniquement l API publique de la feature', () => {
    expect(authExports.KeycloakProvider).toBeDefined()
    expect(authExports.ProtectedRoute).toBeDefined()
    expect(authExports.UserMenu).toBeDefined()
    expect(authExports.useAuth).toBeDefined()
    expect(authExports.useUserProfile).toBeDefined()
    expect(authExports.fetchUserProfile).toBeDefined()
    expect(authExports.userProfileQueryKey).toBeDefined()
    expect(authExports.userProfileSchema).toBeDefined()
  })
})

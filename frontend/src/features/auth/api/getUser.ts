import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { userProfileSchema, type UserProfile } from '../types'

export const userProfileQueryKey = ['auth', 'user-profile'] as const

export async function fetchUserProfile(): Promise<UserProfile> {
  const data = await apiClient<unknown>('/api/v1/me')
  return userProfileSchema.parse(data)
}

export function useUserProfile(enabled = true) {
  return useQuery({
    queryKey: userProfileQueryKey,
    queryFn: fetchUserProfile,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

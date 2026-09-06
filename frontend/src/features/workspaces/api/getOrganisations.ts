import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { organisationsResponseSchema, type Organisation } from '../schemas'

export const organisationsQueryKey = ['workspaces', 'organisations'] as const

export async function fetchOrganisations(): Promise<Organisation[]> {
  const data = await apiClient<unknown>('/api/v1/organisations')
  return organisationsResponseSchema.parse(data)
}

export function useOrganisations(enabled = true) {
  return useQuery({
    queryKey: organisationsQueryKey,
    queryFn: fetchOrganisations,
    enabled,
    staleTime: 60 * 1000,
  })
}

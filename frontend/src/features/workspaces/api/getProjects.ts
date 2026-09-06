import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { projectsResponseSchema, type Project } from '../schemas'

export const projectsQueryKey = (organisationId?: string) =>
  ['workspaces', 'projects', organisationId] as const

export async function fetchProjects(organisationId: string): Promise<Project[]> {
  const data = await apiClient<unknown>(`/api/v1/organisations/${organisationId}/projects`)
  return projectsResponseSchema.parse(data)
}

export function useProjects(organisationId?: string, enabled = true) {
  return useQuery({
    queryKey: projectsQueryKey(organisationId),
    queryFn: () => {
      if (!organisationId) {
        throw new Error('organisationId is required to fetch projects')
      }
      return fetchProjects(organisationId)
    },
    enabled: enabled && !!organisationId,
    staleTime: 60 * 1000,
  })
}

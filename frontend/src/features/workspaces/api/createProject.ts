import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { projectSchema, type CreateProjectInput, type Project } from '../schemas'
import { organisationsQueryKey } from './getOrganisations'
import { projectsQueryKey } from './getProjects'

export interface CreateProjectParams {
  organisationId: string
  data: CreateProjectInput
}

export async function createProject({ organisationId, data }: CreateProjectParams): Promise<Project> {
  const result = await apiClient<unknown>(`/api/v1/organisations/${organisationId}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  return projectSchema.parse(result)
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProject,
    onSuccess: (_newProject, variables) => {
      void queryClient.invalidateQueries({ queryKey: organisationsQueryKey })
      void queryClient.invalidateQueries({
        queryKey: projectsQueryKey(variables.organisationId),
      })
    },
  })
}

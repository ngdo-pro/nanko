import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { documentsListResponseSchema, type DocumentListItem } from '../schemas'

export const documentsQueryKey = (projectId?: string) =>
  ['documents', projectId] as const

export async function fetchDocuments(projectId: string): Promise<DocumentListItem[]> {
  const data = await apiClient<unknown>(`/api/v1/projects/${projectId}/documents`)
  return documentsListResponseSchema.parse(data)
}

export function useDocuments(projectId?: string, enabled = true) {
  return useQuery({
    queryKey: documentsQueryKey(projectId),
    queryFn: () => {
      if (!projectId) {
        throw new Error('projectId is required to fetch documents')
      }
      return fetchDocuments(projectId)
    },
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000,
  })
}

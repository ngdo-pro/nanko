import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { documentDetailSchema, type DocumentDetail } from '../schemas'

export const documentQueryKey = (documentId?: string) =>
  ['document', documentId] as const

export async function fetchDocument(documentId: string): Promise<DocumentDetail> {
  const data = await apiClient<unknown>(`/api/v1/documents/${documentId}`)
  return documentDetailSchema.parse(data)
}

export function useDocument(documentId?: string, enabled = true) {
  return useQuery({
    queryKey: documentQueryKey(documentId),
    queryFn: () => {
      if (!documentId) {
        throw new Error('documentId is required to fetch document')
      }
      return fetchDocument(documentId)
    },
    enabled: enabled && !!documentId,
    staleTime: 10 * 1000,
  })
}

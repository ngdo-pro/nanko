import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { documentDetailSchema, type CreateDocumentInput, type DocumentDetail } from '../schemas'
import { documentsQueryKey } from './getDocuments'

export interface CreateDocumentParams {
  projectId: string
  data: CreateDocumentInput
}

export async function createDocument({ projectId, data }: CreateDocumentParams): Promise<DocumentDetail> {
  const result = await apiClient<unknown>(`/api/v1/projects/${projectId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  return documentDetailSchema.parse(result)
}

export function useCreateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDocument,
    onSuccess: (_newDocument, variables) => {
      void queryClient.invalidateQueries({
        queryKey: documentsQueryKey(variables.projectId),
      })
    },
  })
}

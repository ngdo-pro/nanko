import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { documentDetailSchema, type DocumentDetail, type UpdateDocumentInput } from '../schemas'
import { documentQueryKey } from './getDocument'
import { documentsQueryKey } from './getDocuments'

export interface UpdateDocumentParams {
  documentId: string
  data: UpdateDocumentInput
  projectId?: string
}

export async function updateDocument({ documentId, data }: UpdateDocumentParams): Promise<DocumentDetail> {
  const result = await apiClient<unknown>(`/api/v1/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

  return documentDetailSchema.parse(result)
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDocument,
    onSuccess: (updatedDoc, variables) => {
      queryClient.setQueryData(documentQueryKey(variables.documentId), updatedDoc)
      if (variables.projectId) {
        void queryClient.invalidateQueries({
          queryKey: documentsQueryKey(variables.projectId),
        })
      }
    },
  })
}

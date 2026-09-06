import React from 'react'
import { useAuth } from '@/features/auth'
import { Spinner } from '@/components/ui/Spinner'
import { DocumentEditorView } from '@/views/DocumentEditorView'
import { UnauthenticatedView } from '@/views/UnauthenticatedView'

export const DocumentEditorPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Spinner message="Initialisation de la session..." />
  }

  if (isAuthenticated) {
    return <DocumentEditorView />
  }

  return <UnauthenticatedView />
}

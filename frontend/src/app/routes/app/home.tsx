import React from 'react'
import { useAuth } from '@/features/auth'
import { Spinner } from '@/components/ui/Spinner'
import { DashboardView } from '@/views/DashboardView'
import { UnauthenticatedView } from '@/views/UnauthenticatedView'

export const HomePage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Spinner message="Initialisation de la session..." />
  }

  if (isAuthenticated) {
    return <DashboardView />
  }

  return <UnauthenticatedView />
}

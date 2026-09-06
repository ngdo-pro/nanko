import React from 'react'
import { useAuth } from '@/features/auth'
import { Spinner } from '@/components/ui/Spinner'
import { DashboardView } from '@/views/DashboardView'
import { UnauthenticatedView } from '@/views/UnauthenticatedView'

export const HomePage: React.FC = () => {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('trigger_crash') === 'true') {
    throw new Error('Simulated React render explosion for testing')
  }

  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Spinner message="Initialisation de la session..." />
  }

  if (isAuthenticated) {
    return <DashboardView />
  }

  return <UnauthenticatedView />
}

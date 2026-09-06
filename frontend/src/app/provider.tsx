import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query'
import { KeycloakProvider } from '@/features/auth'
import { WorkspaceProvider } from '@/features/workspaces'
import { AppErrorBoundary } from '@/components/ui/error-boundary'

export interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeycloakProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </KeycloakProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}

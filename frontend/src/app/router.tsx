import React from 'react'
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundaryFallback } from '@/components/AppErrorBoundary'
import { logger } from '@/config/logger'
import { HomePage } from './routes/app/home'
import { DocumentEditorPage } from './routes/app/document-editor'
import { NotFoundPage } from './routes/not-found'

function RouteErrorBoundary() {
  const error = useRouteError()
  const [errorId] = React.useState(() => {
    const err = error instanceof Error ? error : new Error(String(error))
    return logger.error('Uncaught React exception in AppErrorBoundary', {
      error: err.message,
      stack: err.stack,
    })
  })

  return <ErrorBoundaryFallback errorId={errorId} />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'projects/:projectId/documents/:documentId',
        element: <DocumentEditorPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

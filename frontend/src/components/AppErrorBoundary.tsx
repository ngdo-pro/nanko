import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { logger } from '../config/logger'

export interface ErrorBoundaryFallbackProps {
  errorId: string | null
  onReload?: () => void
  onHome?: () => void
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  errorId,
  onReload,
  onHome,
}) => {
  const handleReload = onReload ?? (() => window.location.reload())
  const handleHome = onHome ?? (() => {
    window.location.href = '/'
  })

  return (
    <div
      data-qa="error-boundary-fallback"
      className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6"
    >
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Une anomalie inattendue est survenue</h1>
          <p className="text-sm text-slate-400">
            L'erreur a été enregistrée automatiquement pour analyse.
          </p>
        </div>
        {errorId && (
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-400 text-left">
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Identifiant d'incident :</span>
            <span className="select-all text-slate-300 break-all" data-qa="incident-id">{errorId}</span>
          </div>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            type="button"
            data-qa="reload-button"
            onClick={handleReload}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Recharger l'application
          </button>
          <button
            type="button"
            data-qa="home-button"
            onClick={handleHome}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorId: string | null
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorId: null }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = logger.error('Uncaught React exception in AppErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
    this.setState({ errorId })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          errorId={this.state.errorId}
          onReload={this.handleReload}
          onHome={this.handleHome}
        />
      )
    }

    return this.props.children
  }
}

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary uncaught error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="error-boundary-container"
          data-qa="app-error-boundary"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: 'var(--brand)', marginBottom: '1rem' }}>
            Une erreur inattendue est survenue
          </h2>
          <p
            style={{
              color: 'var(--color-text-secondary, #94a3b8)',
              marginBottom: '1.5rem',
              maxWidth: '32rem',
            }}
          >
            L'application a rencontré une anomalie lors du rendu. Vous pouvez recharger la page pour tenter de rétablir le service.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleReload}
            data-qa="error-retry-button"
          >
            Recharger la page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

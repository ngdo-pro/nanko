import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'
import { initTelemetry } from './config/telemetry'
import { logger } from './config/logger'
import { AppErrorBoundary } from './components/AppErrorBoundary'

initTelemetry()

logger.info('Frontend application initialized', {
  service: 'nanko-frontend',
})

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error(`Uncaught error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error instanceof Error ? event.error.stack : undefined,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined
    logger.error(`Unhandled rejection: ${message}`, {
      reason: message,
      stack,
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

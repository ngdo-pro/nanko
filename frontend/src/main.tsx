import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { KeycloakProvider } from './auth/KeycloakProvider'
import { initTelemetry } from './config/telemetry'

initTelemetry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeycloakProvider>
      <App />
    </KeycloakProvider>
  </StrictMode>,
)

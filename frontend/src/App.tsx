import React from 'react'
import { BrandLogo, BrandIcon } from './components/BrandLogo'
import { ThemeSwitch } from './components/ThemeSwitch'
import { UserMenu } from './components/UserMenu'
import { useAuth } from './auth/useAuth'
import { UnauthenticatedView } from './views/UnauthenticatedView'
import { DashboardView } from './views/DashboardView'
import './App.css'

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <div className="app-container">
      {/* Barre de navigation principale */}
      <header className="navbar">
        <div className="nav-left">
          <BrandLogo withTagline={true} />
          {isAuthenticated && (
            <ul className="nav-links">
              <li>
                <a href="#projets" className="nav-link" data-qa="nav-link-projects">
                  Projets
                </a>
              </li>
              <li>
                <a href="#organisations" className="nav-link" data-qa="nav-link-organisations">
                  Organisations
                </a>
              </li>
            </ul>
          )}
        </div>
        <div className="nav-right">
          <ThemeSwitch />
          <UserMenu />
        </div>
      </header>

      {/* Contenu principal */}
      <main className="app-main">
        {isLoading ? (
          <div className="app-loading-state" data-testid="app-loading" data-qa="app-loading">
            <BrandIcon size={54} className="spinner-logo" />
            <p className="loading-message">Initialisation de la session...</p>
          </div>
        ) : isAuthenticated ? (
          <DashboardView />
        ) : (
          <UnauthenticatedView />
        )}
      </main>

      {/* Pied de page Nanko */}
      <footer className="app-footer">
        <span>&copy; 2026 NANKO &middot; Architecture de code</span>
        <span className="footer-links">
          <a
            href="https://www.nanko.dev"
            target="_blank"
            rel="noopener noreferrer"
            data-qa="footer-link-docs"
          >
            Documentation &amp; Vision
          </a>
        </span>
      </footer>
    </div>
  )
}

export default App

import React from 'react'
import { useAuth } from '../auth/useAuth'

export const UserMenu: React.FC = () => {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth()

  if (isLoading) {
    return (
      <div
        className="user-menu-loading"
        data-testid="user-menu-loading"
        data-qa="user-menu-loading"
      >
        <span className="spinner-dot" aria-label="Chargement...">...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-login"
        data-testid="login-button"
        data-qa="login-button"
        onClick={() => void login()}
      >
        Se connecter
      </button>
    )
  }

  const email = user?.email || ''
  const initial = email ? email.charAt(0).toUpperCase() : 'U'

  return (
    <div
      className="user-menu-authenticated"
      data-testid="user-menu"
      data-qa="user-menu"
    >
      <div
        className="user-avatar"
        title={email}
        data-qa="user-avatar"
        aria-label={`Compte de ${email}`}
      >
        {initial}
      </div>
      <span
        className="user-email"
        data-testid="user-email"
        data-qa="user-email"
      >
        {email}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-logout"
        data-testid="logout-button"
        data-qa="logout-button"
        onClick={() => void logout()}
      >
        Déconnexion
      </button>
    </div>
  )
}

import { useAuth } from '../auth/useAuth'

export function UserMenu() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="user-menu-loading" data-testid="user-menu-loading">
        <span className="spinner-dot">...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        className="btn-login"
        data-testid="login-button"
        onClick={() => void login()}
      >
        Se connecter
      </button>
    )
  }

  const email = user?.email || ''
  const initial = email.charAt(0).toUpperCase()

  return (
    <div className="user-menu-authenticated" data-testid="user-menu">
      <div className="user-avatar" title={email}>
        {initial}
      </div>
      <span className="user-email" data-testid="user-email">
        {email}
      </span>
      <button
        type="button"
        className="btn-logout"
        data-testid="logout-button"
        onClick={() => void logout()}
      >
        Déconnexion
      </button>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { type ThemeChoice, applyTheme, getInitialTheme } from './theme'

export const ThemeSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [theme, setTheme] = useState<ThemeChoice>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const handleSelect = (choice: ThemeChoice) => {
    setTheme(choice)
    applyTheme(choice)
  }

  return (
    <div
      className={`theme-switch ${className}`.trim()}
      role="group"
      aria-label="Thème d'affichage"
      data-qa="theme-switch"
    >
      <button
        type="button"
        data-theme-choice="light"
        data-qa="theme-light"
        aria-pressed={theme === 'light'}
        aria-label="Thème clair"
        title="Clair"
        className={theme === 'light' ? 'active' : ''}
        onClick={() => handleSelect('light')}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
      <button
        type="button"
        data-theme-choice="system"
        data-qa="theme-system"
        aria-pressed={theme === 'system'}
        aria-label="Suivre le système"
        title="Système"
        className={theme === 'system' ? 'active' : ''}
        onClick={() => handleSelect('system')}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="13" rx="1.5" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      </button>
      <button
        type="button"
        data-theme-choice="dark"
        data-qa="theme-dark"
        aria-pressed={theme === 'dark'}
        aria-label="Thème sombre"
        title="Sombre"
        className={theme === 'dark' ? 'active' : ''}
        onClick={() => handleSelect('dark')}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
          stroke="none"
          aria-hidden="true"
        >
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
        </svg>
      </button>
    </div>
  )
}

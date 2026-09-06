import React from 'react'
import { BrandLogo } from '../BrandLogo'
import { ThemeSwitch } from '../ThemeSwitch'
import { UserMenu, useAuth } from '@/features/auth'

export const Navbar: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
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
  )
}

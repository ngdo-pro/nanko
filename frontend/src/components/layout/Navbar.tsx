import React from 'react'
import { BrandLogo } from '../BrandLogo'
import { ThemeSwitch } from '../ThemeSwitch'
import { UserMenu, useAuth } from '@/features/auth'
import { OrganisationSwitcher, ProjectSwitcher } from '@/features/workspaces'

export const Navbar: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
    <header className="navbar">
      <div className="nav-left">
        <BrandLogo withTagline={true} />
        {isAuthenticated && (
          <div className="nav-workspaces" data-qa="nav-workspaces">
            <OrganisationSwitcher />
            <ProjectSwitcher />
          </div>
        )}
      </div>
      <div className="nav-right">
        <ThemeSwitch />
        <UserMenu />
      </div>
    </header>
  )
}

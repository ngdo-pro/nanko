import React from 'react'
import clsx from 'clsx'
import { BrandLogo } from '../BrandLogo'
import { ThemeSwitch } from '../ThemeSwitch'
import { UserMenu, useAuth } from '@/features/auth'
import { OrganisationSwitcher, ProjectSwitcher } from '@/features/workspaces'
import styles from './Navbar.module.css'

export const Navbar: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
    <header className={clsx(styles.navbar, 'navbar')}>
      <div className={clsx(styles.navLeft, 'nav-left')}>
        <BrandLogo withTagline={true} />
        {isAuthenticated && (
          <div className={clsx(styles.navWorkspaces, 'nav-workspaces')} data-qa="nav-workspaces">
            <OrganisationSwitcher />
            <ProjectSwitcher />
          </div>
        )}
      </div>
      <div className={clsx(styles.navRight, 'nav-right')}>
        <ThemeSwitch />
        <UserMenu />
      </div>
    </header>
  )
}

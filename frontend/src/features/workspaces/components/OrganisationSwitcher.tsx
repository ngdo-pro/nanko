import React from 'react'
import clsx from 'clsx'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Organisation } from '../schemas'
import styles from './OrganisationSwitcher.module.css'

export const OrganisationSwitcher: React.FC = () => {
  const { isSolo, activeOrganisation, organisations, setActiveOrganisation } = useWorkspace()

  // Invariant produit : masqué en mode solo (1 seule orga personnelle)
  if (isSolo || !activeOrganisation || organisations.length <= 1) {
    return null
  }

  return (
    <div className={clsx(styles.organisationSwitcher, 'organisation-switcher')} data-qa="organisation-switcher">
      <span className={clsx(styles.organisationSwitcherLabel, 'organisation-switcher-label')}>Organisation :</span>
      <select
        className={clsx(styles.organisationSwitcherSelect, 'organisation-switcher-select')}
        value={activeOrganisation.id}
        onChange={(e) => {
          const selected = organisations.find((org: Organisation) => org.id === e.target.value)
          if (selected) {
            setActiveOrganisation(selected)
          }
        }}
        aria-label="Sélectionner l'organisation active"
        data-qa="active-organisation-select"
      >
        {organisations.map((org: Organisation) => (
          <option key={org.id} value={org.id}>
            {org.name} {org.isPersonal ? '(Personnel)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

import React from 'react'
import clsx from 'clsx'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Project } from '../schemas'
import styles from './ProjectSwitcher.module.css'

export const ProjectSwitcher: React.FC = () => {
  const { activeProject, projects, setActiveProject } = useWorkspace()

  if (!activeProject || projects.length === 0) {
    return null
  }

  return (
    <div className={clsx(styles.projectSwitcher, 'project-switcher')} data-qa="project-switcher">
      <span className={clsx(styles.projectSwitcherLabel, 'project-switcher-label')}>Projet :</span>
      <select
        className={clsx(styles.projectSwitcherSelect, 'project-switcher-select')}
        value={activeProject.id}
        onChange={(e) => {
          const selected = projects.find((p: Project) => p.id === e.target.value)
          if (selected) {
            setActiveProject(selected)
          }
        }}
        aria-label="Sélectionner le projet actif"
        data-qa="active-project-select"
      >
        {projects.map((project: Project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  )
}

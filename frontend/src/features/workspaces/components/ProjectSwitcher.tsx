import React from 'react'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Project } from '../schemas'

export const ProjectSwitcher: React.FC = () => {
  const { activeProject, projects, setActiveProject } = useWorkspace()

  if (!activeProject || projects.length === 0) {
    return null
  }

  return (
    <div className="project-switcher" data-qa="project-switcher">
      <span className="project-switcher-label">Projet :</span>
      <select
        className="project-switcher-select"
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

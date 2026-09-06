import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/features/auth'
import { useOrganisations } from '../api/getOrganisations'
import { WorkspaceContext, type WorkspaceContextValue } from './context'
import type { Organisation, Project } from '../schemas'

const STORAGE_ACTIVE_ORG_KEY = 'nanko_active_org_id'
const STORAGE_ACTIVE_PROJECT_KEY = 'nanko_active_project_id'

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const { data: organisations = [], isLoading, refetch } = useOrganisations(isAuthenticated)

  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_ACTIVE_ORG_KEY)
    }
    return null
  })

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY)
    }
    return null
  })

  // Synchronise l'organisation active valide
  const activeOrganisation = useMemo(() => {
    if (organisations.length === 0) return null
    if (activeOrgId) {
      const found = organisations.find((org) => org.id === activeOrgId)
      if (found) return found
    }
    return organisations[0]
  }, [organisations, activeOrgId])

  const projects = useMemo(() => {
    return activeOrganisation?.projects || []
  }, [activeOrganisation])

  // Synchronise le projet actif valide
  const activeProject = useMemo(() => {
    if (projects.length === 0) return null
    if (activeProjectId) {
      const found = projects.find((p) => p.id === activeProjectId)
      if (found) return found
    }
    return projects[0]
  }, [projects, activeProjectId])

  // Maintient la persistance dans localStorage
  useEffect(() => {
    if (activeOrganisation) {
      localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, activeOrganisation.id)
    }
  }, [activeOrganisation])

  useEffect(() => {
    if (activeProject) {
      localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, activeProject.id)
    }
  }, [activeProject])

  const handleSetActiveOrganisation = (org: Organisation) => {
    setActiveOrgId(org.id)
    localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, org.id)
    // Sélectionne par défaut le premier projet de la nouvelle organisation
    if (org.projects.length > 0) {
      setActiveProjectId(org.projects[0].id)
      localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, org.projects[0].id)
    } else {
      setActiveProjectId(null)
      localStorage.removeItem(STORAGE_ACTIVE_PROJECT_KEY)
    }
  }

  const handleSetActiveProject = (proj: Project) => {
    setActiveProjectId(proj.id)
    localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, proj.id)
  }

  const isSolo = organisations.length <= 1 && (organisations[0]?.isPersonal ?? true)

  const value: WorkspaceContextValue = {
    organisations,
    activeOrganisation,
    activeProject,
    projects,
    isSolo,
    isLoading,
    setActiveOrganisation: handleSetActiveOrganisation,
    setActiveProject: handleSetActiveProject,
    refetchOrganisations: refetch,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export { WorkspaceContext }
export type { WorkspaceContextValue }

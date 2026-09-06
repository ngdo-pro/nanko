import { createContext } from 'react'
import type { Organisation, Project } from '../schemas'

export interface WorkspaceContextValue {
  organisations: Organisation[]
  activeOrganisation: Organisation | null
  activeProject: Project | null
  projects: Project[]
  isSolo: boolean
  isLoading: boolean
  setActiveOrganisation: (org: Organisation) => void
  setActiveProject: (proj: Project) => void
  refetchOrganisations: () => Promise<unknown>
}

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

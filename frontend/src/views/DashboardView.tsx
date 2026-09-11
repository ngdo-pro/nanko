import React, { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '@/features/auth'
import { useWorkspace, CreateProjectModal } from '@/features/workspaces'
import { useDocuments, DocumentList, CreateDocumentModal } from '@/features/documents'
import styles from './DashboardView.module.css'

export interface DashboardViewProps {
  userEmail?: string
}

export const DashboardView: React.FC<DashboardViewProps> = ({ userEmail }) => {
  const { user } = useAuth()
  const { activeProject, projects, setActiveProject, isLoading } = useWorkspace()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)

  const { data: documents = [] } = useDocuments(
    activeProject?.id,
    !!activeProject,
  )

  const displayEmail = userEmail || user?.email || 'architecte'

  return (
    <div className={clsx(styles.dashboardContainer, 'dashboard-container')} data-qa="dashboard-view">
      {/* En-tête de bienvenue */}
      <header className={clsx(styles.dashboardHeader, 'dashboard-header')}>
        <div className={clsx(styles.dashboardWelcomeTag, 'dashboard-welcome-tag')} data-qa="workspace-status">
          Espace de travail actif &middot; Prêt pour la modélisation
        </div>
        <h1 className={clsx(styles.dashboardTitle, 'dashboard-title')}>
          Bienvenue, <span className="text-brand" data-qa="dashboard-user-email">{displayEmail}</span>
        </h1>
        <p className={clsx(styles.dashboardSubtitle, 'dashboard-subtitle')}>
          Pilotez vos architectures logicielles avec rigueur grâce au format versionné .nanko.
        </p>
      </header>

      {/* Section Gestion des Projets */}
      <section className={clsx(styles.dashboardProjectsSection, 'dashboard-projects-section')} data-qa="projects-section">
        <div className={clsx(styles.projectsHeader, 'projects-header')}>
          <h2 className={clsx(styles.projectsTitle, 'projects-title')}>Mes Projets</h2>
          <button
            type="button"
            className="btn btn-primary"
            data-qa="new-project-button"
            onClick={() => setIsModalOpen(true)}
          >
            + Nouveau Projet
          </button>
        </div>

        {isLoading ? (
          <p className="form-hint">Chargement de vos projets...</p>
        ) : (
          <div className={clsx(styles.projectsGrid, 'projects-grid')} data-qa="projects-grid">
            {projects.map((project) => {
              const isActive = activeProject?.id === project.id
              return (
                <button
                  key={project.id}
                  type="button"
                  className={clsx(styles.projectCard, 'project-card', isActive && [styles.active, 'active'])}
                  onClick={() => setActiveProject(project)}
                  data-qa={`project-card-${project.slug}`}
                >
                  <div className={clsx(styles.projectCardHeader, 'project-card-header')}>
                    <span className={clsx(styles.projectCardName, 'project-card-name')}>{project.name}</span>
                    {isActive && (
                      <span className={clsx(styles.projectBadgeActive, 'project-badge-active')} data-qa="active-project-badge">
                        Actif
                      </span>
                    )}
                  </div>
                  <span className={clsx(styles.projectCardSlug, 'project-card-slug')}>{project.slug}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Section Documents : liste si existants, état vide sinon */}
      {activeProject && documents.length > 0 ? (
        <DocumentList
          documents={documents}
          projectId={activeProject.id}
          onNewDocument={() => setIsDocModalOpen(true)}
        />
      ) : (
        <div className={clsx('card', styles.dashboardEmptyState, 'dashboard-empty-state')} data-qa="empty-documents-card">
          <div className={clsx(styles.emptyStateIcon, 'empty-state-icon')} aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>

          <h2 className={clsx(styles.emptyStateTitle, 'empty-state-title')}>
            {activeProject
              ? `Projet : ${activeProject.name}`
              : "Aucun document d'architecture pour le moment"}
          </h2>
          <p className={clsx(styles.emptyStateDescription, 'empty-state-description')}>
            Commencez par initialiser un nouveau document d'architecture dans ce projet ou importez un fichier <code>.nanko</code> existant.
          </p>

          <div className={clsx(styles.emptyStateActions, 'empty-state-actions')}>
            <button
              type="button"
              className="btn btn-primary"
              data-qa="new-document-button"
              onClick={() => setIsDocModalOpen(true)}
            >
              + Nouveau Document
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              data-qa="import-document-button"
              onClick={() => {
                alert('Import de fichier .nanko bientôt disponible.')
              }}
            >
              &uarr; Importer un .nanko
            </button>
          </div>
        </div>
      )}

      {/* Aide-mémoire syntaxique */}
      <section className={clsx(styles.dashboardSyntaxReminder, 'dashboard-syntax-reminder')} data-qa="syntax-reminder">
        <div className={clsx(styles.syntaxHeader, 'syntax-header')}>
          <span className={clsx(styles.syntaxTitle, 'syntax-title')}>RAPPEL SYNTAXIQUE RAPIDE</span>
        </div>
        <div className={clsx(styles.syntaxContent, 'syntax-content')}>
          <code>
            @id [nom] &middot; @layer [0] &middot; rectangle &middot; circle &middot; text &middot; connector
          </code>
        </div>
      </section>

      {/* Modales */}
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {activeProject && (
        <CreateDocumentModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          projectId={activeProject.id}
        />
      )}
    </div>
  )
}

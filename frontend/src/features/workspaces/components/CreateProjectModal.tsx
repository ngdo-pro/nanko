import React, { useState } from 'react'
import { useCreateProject } from '../api/createProject'
import { createProjectSchema } from '../schemas'
import { useWorkspace } from '../hooks/useWorkspace'
import { ApiError } from '@/types/api'

export interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { activeOrganisation, setActiveProject, refetchOrganisations } = useWorkspace()
  const createMutation = useCreateProject()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    if (!slugManuallyEdited) {
      setSlug(slugify(newName))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true)
    setSlug(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!activeOrganisation) {
      setValidationError('Aucune organisation active sélectionnée.')
      return
    }

    const validation = createProjectSchema.safeParse({ name, slug })
    if (!validation.success) {
      setValidationError(validation.error.issues[0]?.message || 'Données invalides.')
      return
    }

    try {
      const createdProject = await createMutation.mutateAsync({
        organisationId: activeOrganisation.id,
        data: { name: validation.data.name, slug: validation.data.slug },
      })

      await refetchOrganisations()
      setActiveProject(createdProject)
      setName('')
      setSlug('')
      setSlugManuallyEdited(false)
      onClose()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorData = err.data as Record<string, unknown> | undefined
        if (errorData && typeof errorData.message === 'string') {
          setValidationError(errorData.message)
          return
        }
        if (
          errorData &&
          Array.isArray(errorData.violations) &&
          errorData.violations.length > 0
        ) {
          const firstViolation = errorData.violations[0] as { title?: string }
          if (firstViolation.title) {
            setValidationError(firstViolation.title)
            return
          }
        }
      }
      setValidationError('Une erreur inattendue est survenue lors de la création du projet.')
    }
  }

  return (
    <div className="modal-backdrop" data-qa="create-project-modal-backdrop">
      <div className="modal-content card" data-qa="create-project-modal">
        <header className="modal-header">
          <h2 className="modal-title">Nouveau Projet</h2>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Fermer"
            data-qa="close-modal-button"
          >
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          {validationError && (
            <div className="alert alert-error" data-qa="create-project-error" role="alert">
              {validationError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="project-name" className="form-label">
              Nom du projet
            </label>
            <input
              id="project-name"
              type="text"
              className="input"
              value={name}
              onChange={handleNameChange}
              placeholder="ex. Architecture E-Commerce"
              data-qa="project-name-input"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-slug" className="form-label">
              Identifiant technique (slug)
            </label>
            <input
              id="project-slug"
              type="text"
              className="input"
              value={slug}
              onChange={handleSlugChange}
              placeholder="ex. architecture-ecommerce"
              data-qa="project-slug-input"
              required
            />
            <small className="form-hint">
              Utilisé dans les URLs et références de documents (minuscules, chiffres et tirets).
            </small>
          </div>

          <footer className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              data-qa="cancel-project-button"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
              data-qa="submit-create-project"
            >
              {createMutation.isPending ? 'Création...' : 'Créer le projet'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

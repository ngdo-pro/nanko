import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCreateDocument } from '../api/createDocument'
import { createDocumentSchema, type DocumentDetail } from '../schemas'
import { ApiError } from '@/types/api'

export interface CreateDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess?: (doc: DocumentDetail) => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}) => {
  const navigate = useNavigate()
  const createMutation = useCreateDocument()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [layer, setLayer] = useState(0)
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

    if (!projectId) {
      setValidationError('Aucun projet actif sélectionné.')
      return
    }

    const validation = createDocumentSchema.safeParse({ name, slug, layer })
    if (!validation.success) {
      setValidationError(validation.error.issues[0]?.message || 'Données invalides.')
      return
    }

    try {
      const createdDocument = await createMutation.mutateAsync({
        projectId,
        data: validation.data,
      })

      setName('')
      setSlug('')
      setLayer(0)
      setSlugManuallyEdited(false)
      onClose()

      if (onSuccess) {
        onSuccess(createdDocument)
      } else {
        navigate(`/projects/${projectId}/documents/${createdDocument.id}`)
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorData = err.data as Record<string, unknown> | undefined
        if (err.status === 409) {
          setValidationError(
            (errorData?.message as string) ||
              'Un document avec ce slug existe déjà dans ce projet.',
          )
          return
        }
        if (err.status === 422 && Array.isArray(errorData?.violations)) {
          const firstViolation = errorData.violations[0] as { title?: string } | undefined
          setValidationError(firstViolation?.title || 'Données de formulaire non valides.')
          return
        }
      }
      setValidationError('Une erreur est survenue lors de la création du document.')
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-document-title"
      data-qa="create-document-modal"
    >
      <div className="card modal-card">
        <div className="modal-header">
          <h2 id="create-document-title" className="modal-title">
            Nouveau Document
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Fermer la boîte de dialogue"
            data-qa="cancel-document-button"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {validationError && (
            <div className="form-error-banner" role="alert" data-qa="document-form-error">
              {validationError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="document-name" className="form-label">
              Nom du Document
            </label>
            <input
              id="document-name"
              type="text"
              className="input"
              value={name}
              onChange={handleNameChange}
              placeholder="ex: Architecture E-Commerce"
              data-qa="document-name-input"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="document-slug" className="form-label">
              Identifiant d'URL (Slug)
            </label>
            <input
              id="document-slug"
              type="text"
              className="input"
              value={slug}
              onChange={handleSlugChange}
              placeholder="ex: architecture-ecommerce"
              data-qa="document-slug-input"
              required
            />
            <span className="form-hint">
              Minuscules, chiffres et tirets uniquement. Unique par projet.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="document-layer" className="form-label">
              Profondeur (Layer)
            </label>
            <input
              id="document-layer"
              type="number"
              className="input"
              value={layer}
              onChange={(e) => setLayer(parseInt(e.target.value, 10) || 0)}
              data-qa="document-layer-input"
              required
            />
            <span className="form-hint">
              Niveau z-index du Document au sein du Projet (0 par défaut).
            </span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || !name.trim()}
              data-qa="submit-create-document"
            >
              {createMutation.isPending ? 'Création...' : 'Créer le Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

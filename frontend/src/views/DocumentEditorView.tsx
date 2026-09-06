import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useDocument, useUpdateDocument } from '@/features/documents'
import { SourceCodeEditor } from '@/features/documents/components/SourceCodeEditor'
import { AstInspector } from '@/features/documents/components/AstInspector'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/types/api'
import type { DocumentDetail } from '@/features/documents'

interface DocumentEditorContentProps {
  document: DocumentDetail
  projectId: string
}

const DocumentEditorContent: React.FC<DocumentEditorContentProps> = ({ document, projectId }) => {
  const navigate = useNavigate()
  const updateMutation = useUpdateDocument()
  const [code, setCode] = useState<string>(document.sourceCode)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)

  const hasUnsavedChanges = code !== document.sourceCode

  // Protection contre la perte accidentelle de données
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleSave = async () => {
    setSyntaxError(null)

    try {
      await updateMutation.mutateAsync({
        documentId: document.id,
        data: { sourceCode: code },
        projectId,
      })
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorData = err.data as Record<string, unknown> | undefined
        if (err.status === 422 && errorData?.code === 'INVALID_NANKO_SYNTAX') {
          setSyntaxError((errorData.message as string) || 'Erreur de syntaxe .nanko.')
          return
        }
        if (errorData?.message) {
          setSyntaxError(errorData.message as string)
          return
        }
      }
      setSyntaxError("Une erreur inattendue est survenue lors de l'enregistrement.")
    }
  }

  return (
    <div className="editor-studio" data-qa="document-editor-view">
      {/* Barre d'outils supérieure */}
      <header className="editor-topbar">
        <div className="editor-topbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            data-qa="back-to-project-button"
          >
            &larr; Projets
          </button>
          <div className="editor-doc-meta">
            <div className="editor-doc-title-row">
              <h1 className="editor-doc-title" data-qa="document-title">
                {document.name}
              </h1>
              <span className="badge-layer" data-qa="document-layer-badge">
                Layer {document.layer}
              </span>
            </div>
            <span className="editor-doc-slug">{document.slug}</span>
          </div>
        </div>

        <div className="editor-topbar-right">
          {/* Badge d'état de sauvegarde */}
          {updateMutation.isPending ? (
            <span className="save-status-pill saving">
              <span className="status-dot" />
              Sauvegarde...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="save-status-pill unsaved" data-qa="unsaved-changes-badge">
              <span className="status-dot" />
              Modifications non enregistrées
            </span>
          ) : (
            <span className="save-status-pill saved" data-qa="saved-status-badge">
              <span className="status-dot" />
              Enregistré ✓
            </span>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-qa="save-document-button"
            title="Raccourci : Cmd+S ou Ctrl+S"
          >
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer (Cmd+S)'}
          </button>
        </div>
      </header>

      {/* Zone de travail en 2 colonnes */}
      <div className="editor-workspace-grid">
        {/* Éditeur de code source */}
        <SourceCodeEditor
          value={code}
          onChange={setCode}
          onSave={handleSave}
          disabled={updateMutation.isPending}
          documentSlug={document.slug}
        />

        {/* Volet d'inspection AST */}
        <AstInspector
          ast={document.ast}
          syntaxError={syntaxError}
        />
      </div>
    </div>
  )
}

export const DocumentEditorView: React.FC = () => {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>()
  const navigate = useNavigate()

  const { data: document, isLoading, error: fetchError } = useDocument(
    documentId,
    !!documentId,
  )

  if (isLoading) {
    return <Spinner message="Chargement du document..." />
  }

  if (fetchError || !document || !projectId) {
    return (
      <div className="card editor-error-state" data-qa="document-error-view">
        <h2 className="editor-error-title">Document introuvable ou inaccessible</h2>
        <p className="editor-error-text">
          Vous n'avez pas accès à ce document ou il a été supprimé.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          &larr; Retour au tableau de bord
        </button>
      </div>
    )
  }

  return <DocumentEditorContent key={document.id} document={document} projectId={projectId} />
}

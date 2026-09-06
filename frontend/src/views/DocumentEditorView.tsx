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
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950" data-qa="document-editor-view">
      {/* Barre d'outils supérieure */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn btn-secondary text-xs py-1.5 px-3"
            onClick={() => navigate('/')}
            data-qa="back-to-project-button"
          >
            &larr; Projets
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100" data-qa="document-title">
                {document.name}
              </h1>
              <span className="project-badge-active text-xs px-2 py-0.5 rounded" data-qa="document-layer-badge">
                Layer {document.layer}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">{document.slug}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge d'état de sauvegarde */}
          {updateMutation.isPending ? (
            <span className="text-xs text-amber-400 flex items-center gap-1.5">
              <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
              Sauvegarde...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-xs text-amber-400/90 font-medium" data-qa="unsaved-changes-badge">
              Modifications non enregistrées
            </span>
          ) : (
            <span className="text-xs text-emerald-400/90 font-medium" data-qa="saved-status-badge">
              Enregistré &check;
            </span>
          )}

          <button
            type="button"
            className="btn btn-primary text-sm py-1.5 px-4"
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
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">
        {/* Éditeur de code source (8 colonnes) */}
        <section className="col-span-12 lg:col-span-8 h-full min-h-0 flex flex-col">
          <SourceCodeEditor
            value={code}
            onChange={setCode}
            onSave={handleSave}
            disabled={updateMutation.isPending}
          />
        </section>

        {/* Volet d'inspection AST (4 colonnes) */}
        <section className="col-span-12 lg:col-span-4 h-full min-h-0">
          <AstInspector
            ast={document.ast}
            syntaxError={syntaxError}
          />
        </section>
      </main>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6" data-qa="document-error-view">
        <h2 className="text-xl font-bold text-red-400 mb-2">Document introuvable ou inaccessible</h2>
        <p className="text-slate-400 mb-6 max-w-md">
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

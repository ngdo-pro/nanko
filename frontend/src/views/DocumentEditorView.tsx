import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useDocument,
  useUpdateDocument,
  NankoCanvas,
  LayoutSelector,
  type LayoutMode,
  updateNankoSourceLayout,
  updateNankoSourceBulkLayout,
  insertShapeToSource,
  type ShapePrimitiveType,
  parseNankoSource,
  type NankoAst,
} from '@/features/documents'
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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split')

  const { ast: parsedAst, syntaxError: localSyntaxError } = useMemo(
    () => parseNankoSource(code),
    [code],
  )

  const activeAst = useMemo<NankoAst>(() => {
    if (parsedAst.shapes.length > 0 || parsedAst.connectors.length > 0) {
      const mergedLayout = {
        ...(document.ast?.layout ?? {}),
        ...parsedAst.layout,
      }
      return {
        ...parsedAst,
        layout: mergedLayout,
      }
    }
    if (code === document.sourceCode && document.ast) {
      return document.ast
    }
    return parsedAst
  }, [parsedAst, code, document.sourceCode, document.ast])

  const effectiveSyntaxError = syntaxError || localSyntaxError

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

  const handleNodePositionChange = (nodeId: string, position: { x: number; y: number }) => {
    setCode((prevCode) => updateNankoSourceLayout(prevCode, nodeId, position))
  }

  const handleAutoLayoutApplied = (layout: Record<string, { x: number; y: number }>) => {
    setCode((prevCode) => updateNankoSourceBulkLayout(prevCode, layout))
  }

  const handleCreateShape = (shapeType: ShapePrimitiveType, position: { x: number; y: number }) => {
    setCode((prevCode) => {
      const { newSourceCode } = insertShapeToSource(prevCode, { type: shapeType, position })
      return newSourceCode
    })
  }

  return (
    <div
      className={`editor-studio ${layoutMode === 'canvas' ? 'is-canvas-mode' : 'is-split-or-code-mode'}`}
      data-qa="document-editor-view"
    >
      {/* Barre d'outils supérieure */}
      <header
        className={`editor-topbar ${layoutMode === 'canvas' ? 'is-floating' : 'is-static'}`}
        data-qa="editor-topbar"
      >
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

        {/* Sélecteur de mode central */}
        <div className="editor-topbar-center">
          <LayoutSelector mode={layoutMode} onChange={setLayoutMode} />
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

      {/* Alerte d'erreur de syntaxe globale */}
      {effectiveSyntaxError && (
        <div
          className={`syntax-error-card editor-syntax-error-banner ${layoutMode === 'canvas' ? 'is-floating-error' : ''}`}
          role="alert"
          data-qa="syntax-error-alert"
          style={{ marginBottom: layoutMode === 'canvas' ? 0 : '1rem' }}
        >
          <div className="syntax-error-header">
            <span>⚠️</span>
            <span>Erreur de syntaxe .nanko</span>
          </div>
          <p style={{ margin: 0 }}>{effectiveSyntaxError}</p>
        </div>
      )}

      {/* Zone de travail selon le mode sélectionné */}
      <div className={`editor-workspace-container layout-${layoutMode}`}>
        {layoutMode === 'split' && (
          <div className="editor-workspace-grid mode-split">
            <SourceCodeEditor
              value={code}
              onChange={setCode}
              onSave={handleSave}
              disabled={updateMutation.isPending}
              documentSlug={document.slug}
            />
            <NankoCanvas
              ast={activeAst}
              syntaxError={effectiveSyntaxError}
              onNodePositionChange={handleNodePositionChange}
              onAutoLayoutApplied={handleAutoLayoutApplied}
              onCreateShape={handleCreateShape}
            />
          </div>
        )}

        {layoutMode === 'canvas' && (
          <div className="editor-workspace-canvas-only mode-canvas">
            <NankoCanvas
              ast={activeAst}
              syntaxError={effectiveSyntaxError}
              onNodePositionChange={handleNodePositionChange}
              onAutoLayoutApplied={handleAutoLayoutApplied}
              onCreateShape={handleCreateShape}
            />
          </div>
        )}

        {layoutMode === 'code' && (
          <div className="editor-workspace-code-only mode-code">
            <div className="code-editor-full">
              <SourceCodeEditor
                value={code}
                onChange={setCode}
                onSave={handleSave}
                disabled={updateMutation.isPending}
                documentSlug={document.slug}
              />
            </div>
            <div className="code-ast-inspector-side">
              <AstInspector
                ast={activeAst}
                syntaxError={effectiveSyntaxError}
              />
            </div>
          </div>
        )}
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

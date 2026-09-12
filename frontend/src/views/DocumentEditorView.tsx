import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import clsx from 'clsx'
import styles from './DocumentEditorView.module.css'
import {
  useDocument,
  useUpdateDocument,
  NankoCanvas,
  LayoutSelector,
  type LayoutMode,
  updateNankoSourceLayout,
  updateNankoSourceBulkLayout,
  insertShapeToSource,
  insertConnectorToSource,
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

  const handleConnectorCreated = (source: string, target: string) => {
    setCode((prevCode) => {
      const { newSourceCode } = insertConnectorToSource(prevCode, source, target)
      return newSourceCode
    })
  }

  return (
    <div
      className={clsx(
        styles.editorStudio,
        'editor-studio',
        layoutMode === 'canvas' ? [styles.isCanvasMode, 'is-canvas-mode'] : [styles.isSplitOrCodeMode, 'is-split-or-code-mode'],
      )}
      data-qa="document-editor-view"
    >
      {/* Barre d'outils supérieure */}
      <header
        className={clsx(
          styles.editorTopbar,
          'editor-topbar',
          layoutMode === 'canvas' ? [styles.isFloating, 'is-floating'] : [styles.isStatic, 'is-static'],
        )}
        data-qa="editor-topbar"
      >
        <div className={clsx(styles.editorTopbarLeft, 'editor-topbar-left')}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            data-qa="back-to-project-button"
          >
            &larr; Projets
          </button>
          <div className={clsx(styles.editorDocMeta, 'editor-doc-meta')}>
            <div className={clsx(styles.editorDocTitleRow, 'editor-doc-title-row')}>
              <h1 className={clsx(styles.editorDocTitle, 'editor-doc-title')} data-qa="document-title">
                {document.name}
              </h1>
              <span className={clsx(styles.badgeLayer, 'badge-layer')} data-qa="document-layer-badge">
                Layer {document.layer}
              </span>
            </div>
            <span className={clsx(styles.editorDocSlug, 'editor-doc-slug')}>{document.slug}</span>
          </div>
        </div>

        {/* Sélecteur de mode central */}
        <div className={clsx(styles.editorTopbarCenter, 'editor-topbar-center')}>
          <LayoutSelector mode={layoutMode} onChange={setLayoutMode} />
        </div>

        <div className={clsx(styles.editorTopbarRight, 'editor-topbar-right')}>
          {/* Badge d'état de sauvegarde */}
          {updateMutation.isPending ? (
            <span className={clsx(styles.saveStatusPill, styles.saving, 'save-status-pill saving')}>
              <span className={clsx(styles.statusDot, 'status-dot')} />
              Sauvegarde...
            </span>
          ) : hasUnsavedChanges ? (
            <span className={clsx(styles.saveStatusPill, styles.unsaved, 'save-status-pill unsaved')} data-qa="unsaved-changes-badge">
              <span className={clsx(styles.statusDot, 'status-dot')} />
              Modifications non enregistrées
            </span>
          ) : (
            <span className={clsx(styles.saveStatusPill, styles.saved, 'save-status-pill saved')} data-qa="saved-status-badge">
              <span className={clsx(styles.statusDot, 'status-dot')} />
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
          className={clsx(
            styles.syntaxErrorCard,
            styles.editorSyntaxErrorBanner,
            'syntax-error-card editor-syntax-error-banner',
            layoutMode === 'canvas' && [styles.isFloatingError, 'is-floating-error'],
          )}
          role="alert"
          data-qa="syntax-error-alert"
          style={{ marginBottom: layoutMode === 'canvas' ? 0 : '1rem' }}
        >
          <div className={clsx(styles.syntaxErrorHeader, 'syntax-error-header')}>
            <span>⚠️</span>
            <span>Erreur de syntaxe .nanko</span>
          </div>
          <p style={{ margin: 0 }}>{effectiveSyntaxError}</p>
        </div>
      )}

      {/* Zone de travail selon le mode sélectionné */}
      <div className={clsx(styles.editorWorkspaceContainer, 'editor-workspace-container', `layout-${layoutMode}`, layoutMode === 'canvas' && styles.layoutCanvas)}>
        {layoutMode === 'split' && (
          <div className={clsx(styles.editorWorkspaceGrid, styles.modeSplit, 'editor-workspace-grid mode-split')}>
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
              onConnectorCreated={handleConnectorCreated}
            />
          </div>
        )}

        {layoutMode === 'canvas' && (
          <div className={clsx(styles.editorWorkspaceCanvasOnly, styles.modeCanvas, 'editor-workspace-canvas-only mode-canvas')}>
            <NankoCanvas
              ast={activeAst}
              syntaxError={effectiveSyntaxError}
              onNodePositionChange={handleNodePositionChange}
              onAutoLayoutApplied={handleAutoLayoutApplied}
              onCreateShape={handleCreateShape}
              onConnectorCreated={handleConnectorCreated}
            />
          </div>
        )}

        {layoutMode === 'code' && (
          <div className={clsx(styles.editorWorkspaceCodeOnly, styles.modeCode, 'editor-workspace-code-only mode-code')}>
            <div className={clsx(styles.codeEditorFull, 'code-editor-full')}>
              <SourceCodeEditor
                value={code}
                onChange={setCode}
                onSave={handleSave}
                disabled={updateMutation.isPending}
                documentSlug={document.slug}
              />
            </div>
            <div className={clsx(styles.codeAstInspectorSide, 'code-ast-inspector-side')}>
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
      <div className={clsx('card', styles.editorErrorState, 'editor-error-state')} data-qa="document-error-view">
        <h2 className={clsx(styles.editorErrorTitle, 'editor-error-title')}>Document introuvable ou inaccessible</h2>
        <p className={clsx(styles.editorErrorText, 'editor-error-text')}>
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

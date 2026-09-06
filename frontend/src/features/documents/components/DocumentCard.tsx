import React from 'react'
import { useNavigate } from 'react-router'
import { type DocumentListItem } from '../schemas'

export interface DocumentCardProps {
  document: DocumentListItem
  projectId: string
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, projectId }) => {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="card project-card text-left w-full hover:border-brand transition-colors p-5 flex flex-col justify-between"
      onClick={() => navigate(`/projects/${projectId}/documents/${document.id}`)}
      data-qa={`document-card-${document.slug}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg text-slate-100 truncate">
            {document.name}
          </h3>
          <span className="project-badge-active text-xs px-2 py-0.5 rounded" data-qa="document-layer-badge">
            Layer {document.layer}
          </span>
        </div>
        <p className="text-sm text-slate-400 font-mono mb-4">{document.slug}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
        <span data-qa="document-shapes-count">
          {document.shapesCount ?? 0} {document.shapesCount === 1 ? 'Shape' : 'Shapes'} &middot;{' '}
          {document.connectorsCount ?? 0} {document.connectorsCount === 1 ? 'Connecteur' : 'Connecteurs'}
        </span>
        <span className="text-brand flex items-center gap-1 font-medium">
          Ouvrir &rarr;
        </span>
      </div>
    </button>
  )
}

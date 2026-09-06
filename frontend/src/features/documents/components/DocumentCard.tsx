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
      className="document-card"
      onClick={() => navigate(`/projects/${projectId}/documents/${document.id}`)}
      data-qa={`document-card-${document.slug}`}
    >
      <div>
        <div className="document-card-header">
          <h3 className="document-card-title">
            {document.name}
          </h3>
          <span className="badge-layer" data-qa="document-layer-badge">
            Layer {document.layer}
          </span>
        </div>
        <p className="document-card-slug">{document.slug}</p>
      </div>

      <div className="document-card-footer">
        <span className="document-card-counts" data-qa="document-shapes-count">
          {document.shapesCount ?? 0} {document.shapesCount === 1 ? 'Shape' : 'Shapes'} &middot;{' '}
          {document.connectorsCount ?? 0} {document.connectorsCount === 1 ? 'Connecteur' : 'Connecteurs'}
        </span>
        <span className="document-card-cta">
          Ouvrir &rarr;
        </span>
      </div>
    </button>
  )
}

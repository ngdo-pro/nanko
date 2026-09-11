import React from 'react'
import { useNavigate } from 'react-router'
import clsx from 'clsx'
import { type DocumentListItem } from '../schemas'
import styles from './DocumentCard.module.css'

export interface DocumentCardProps {
  document: DocumentListItem
  projectId: string
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, projectId }) => {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className={clsx(styles.documentCard, 'document-card')}
      onClick={() => navigate(`/projects/${projectId}/documents/${document.id}`)}
      data-qa={`document-card-${document.slug}`}
    >
      <div>
        <div className={clsx(styles.documentCardHeader, 'document-card-header')}>
          <h3 className={clsx(styles.documentCardTitle, 'document-card-title')}>
            {document.name}
          </h3>
          <span className={clsx(styles.badgeLayer, 'badge-layer')} data-qa="document-layer-badge">
            Layer {document.layer}
          </span>
        </div>
        <p className={clsx(styles.documentCardSlug, 'document-card-slug')}>{document.slug}</p>
      </div>

      <div className={clsx(styles.documentCardFooter, 'document-card-footer')}>
        <span className={clsx(styles.documentCardCounts, 'document-card-counts')} data-qa="document-shapes-count">
          {document.shapesCount ?? 0} {document.shapesCount === 1 ? 'Shape' : 'Shapes'} &middot;{' '}
          {document.connectorsCount ?? 0} {document.connectorsCount === 1 ? 'Connecteur' : 'Connecteurs'}
        </span>
        <span className={clsx(styles.documentCardCta, 'document-card-cta')}>
          Ouvrir &rarr;
        </span>
      </div>
    </button>
  )
}

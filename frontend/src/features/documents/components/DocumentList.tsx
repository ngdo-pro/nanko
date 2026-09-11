import React from 'react'
import clsx from 'clsx'
import { type DocumentListItem } from '../schemas'
import { DocumentCard } from './DocumentCard'
import styles from './DocumentList.module.css'

export interface DocumentListProps {
  documents: DocumentListItem[]
  projectId: string
  onNewDocument: () => void
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  projectId,
  onNewDocument,
}) => {
  return (
    <section className={clsx(styles.dashboardDocumentsSection, 'dashboard-documents-section')} data-qa="documents-section">
      <div className={clsx(styles.documentsSectionHeader, 'documents-section-header')}>
        <div>
          <h2 className={clsx(styles.documentsSectionTitle, 'documents-section-title')}>Mes Documents</h2>
          <p className={clsx(styles.documentsSectionSubtitle, 'documents-section-subtitle')}>
            Schémas d'architecture versionnés pour ce projet.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNewDocument}
          data-qa="new-document-button"
        >
          + Nouveau Document
        </button>
      </div>

      <div className={clsx(styles.documentsGrid, 'documents-grid')} data-qa="documents-grid">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} projectId={projectId} />
        ))}
      </div>
    </section>
  )
}

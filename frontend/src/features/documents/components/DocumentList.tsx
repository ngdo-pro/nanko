import React from 'react'
import { type DocumentListItem } from '../schemas'
import { DocumentCard } from './DocumentCard'

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
    <section className="dashboard-documents-section mt-8" data-qa="documents-section">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Mes Documents</h2>
          <p className="text-sm text-slate-400">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-qa="documents-grid">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} projectId={projectId} />
        ))}
      </div>
    </section>
  )
}

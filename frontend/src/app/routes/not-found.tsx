import React from 'react'
import { Link } from 'react-router'
import { BrandIcon } from '@/components/BrandLogo'

export const NotFoundPage: React.FC = () => {
  return (
    <div
      className="not-found-container"
      data-qa="not-found-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ opacity: 0.6, marginBottom: '1.5rem' }}>
        <BrandIcon size={64} />
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--brand)', marginBottom: '0.5rem' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        Page introuvable
      </h2>
      <p style={{ color: 'var(--color-text-secondary, #94a3b8)', maxWidth: '28rem', marginBottom: '2rem' }}>
        La ressource que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        to="/"
        className="btn btn-primary"
        data-qa="not-found-home-link"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}

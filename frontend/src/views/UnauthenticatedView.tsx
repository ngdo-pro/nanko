import React from 'react'
import { useAuth } from '../auth/useAuth'

export const NANKO_CODE_PREVIEW = `@id platform-overview
@version app:1.2.0
@satisfies infra:^2.0

rectangle webapp "Application React"
rectangle api "Backend Symfony API"
database db "PostgreSQL 16"

connector webapp api "REST / TLS"
connector api db "Doctrine DBAL"

!LAYOUT
webapp -> api -> db
!END`

export const UnauthenticatedView: React.FC = () => {
  const { login } = useAuth()

  return (
    <div className="portal-container" data-testid="unauthenticated-view" data-qa="unauthenticated-view">
      <section className="portal-hero">
        <div className="hero-badge" data-qa="hero-badge">
          DIAGRAMMES C4 · DSL VERSIONNÉ
        </div>
        <h1 className="hero-title">
          Vos diagrammes d'architecture, <span className="text-brand">écrits comme du code</span>.
        </h1>
        <p className="hero-subtitle">
          Fini les schémas statiques déphasés. Nanko transforme vos fichiers texte versionnés
          en architectures vivantes, synchronisées avec votre base de données runtime.
        </p>
      </section>

      <div className="portal-grid">
        {/* Carte CTA d'accès */}
        <div className="card portal-card-cta" data-qa="auth-portal-card">
          <div className="card-header">
            <span className="card-tag">ACCÈS À LA PLATEFORME</span>
            <h2>Concevez & collaborez</h2>
          </div>
          <p className="card-description">
            Concevez, versionnez et naviguez dans vos architectures logicielles avec la base de
            données comme source de vérité.
          </p>
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-primary btn-cta"
              data-testid="portal-login-button"
              data-qa="portal-login-button"
              onClick={() => void login()}
            >
              Se connecter / Créer un compte &rarr;
            </button>
          </div>
          <div className="card-footer-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Authentification sécurisée avec Keycloak IAM</span>
          </div>
        </div>

        {/* Bloc prévisualisation syntaxique .nanko */}
        <div className="card portal-code-card" data-qa="dsl-preview-card">
          <div className="code-card-header">
            <div className="code-dots" aria-hidden="true">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <span className="code-card-title">nanko-platform.nanko</span>
          </div>
          <pre className="code-block">
            <code>{NANKO_CODE_PREVIEW}</code>
          </pre>
        </div>
      </div>

      {/* Piliers Nanko */}
      <section className="portal-tenets" data-qa="portal-tenets">
        <div className="tenet-item">
          <span className="tenet-check" aria-hidden="true">&#x2713;</span>
          <span className="tenet-text">Base de données source de vérité</span>
        </div>
        <div className="tenet-item">
          <span className="tenet-check" aria-hidden="true">&#x2713;</span>
          <span className="tenet-text">Rendu déterministe C4</span>
        </div>
        <div className="tenet-item">
          <span className="tenet-check" aria-hidden="true">&#x2713;</span>
          <span className="tenet-text">Navigation multi-layer</span>
        </div>
      </section>
    </div>
  )
}

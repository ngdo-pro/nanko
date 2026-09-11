import React from 'react'
import clsx from 'clsx'
import { useAuth } from '@/features/auth'
import { trackEvent } from '@/lib/analytics'
import styles from './UnauthenticatedView.module.css'

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
    <div className={clsx(styles.portalContainer, 'portal-container')} data-qa="unauthenticated-view">
      <section className={clsx(styles.portalHero, 'portal-hero')}>
        <div className={clsx(styles.heroBadge, 'hero-badge')} data-qa="hero-badge">
          DIAGRAMMES C4 · DSL VERSIONNÉ
        </div>
        <h1 className={clsx(styles.heroTitle, 'hero-title')}>
          Vos diagrammes d'architecture, <span className={clsx(styles.textBrand, 'text-brand')}>écrits comme du code</span>.
        </h1>
        <p className={clsx(styles.heroSubtitle, 'hero-subtitle')}>
          Fini les schémas statiques déphasés. Nanko transforme vos fichiers texte versionnés
          en architectures vivantes, synchronisées avec votre base de données runtime.
        </p>
      </section>

      <div className={clsx(styles.portalGrid, 'portal-grid')}>
        {/* Carte CTA d'accès */}
        <div className={clsx(styles.card, styles.portalCardCta, 'card portal-card-cta')} data-qa="auth-portal-card">
          <div className="card-header">
            <span className={clsx(styles.cardTag, 'card-tag')}>ACCÈS À LA PLATEFORME</span>
            <h2>Concevez & collaborez</h2>
          </div>
          <p className={clsx(styles.cardDescription, 'card-description')}>
            Concevez, versionnez et naviguez dans vos architectures logicielles avec la base de
            données comme source de vérité.
          </p>
          <div className="card-actions">
            <button
              type="button"
              className={clsx('btn btn-primary', styles.btnCta, 'btn-cta')}
              data-qa="portal-login-button"
              onClick={() => {
                trackEvent('login_initiated')
                void login()
              }}
            >
              Se connecter / Créer un compte &rarr;
            </button>
          </div>
          <div className={clsx(styles.cardFooterNote, 'card-footer-note')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Authentification sécurisée avec Keycloak IAM</span>
          </div>
        </div>

        {/* Bloc prévisualisation syntaxique .nanko */}
        <div className={clsx(styles.card, styles.portalCodeCard, 'card portal-code-card')} data-qa="dsl-preview-card">
          <div className={clsx(styles.codeCardHeader, 'code-card-header')}>
            <div className={clsx(styles.codeDots, 'code-dots')} aria-hidden="true">
              <span className={clsx(styles.dot, styles.dotRed, 'dot dot-red')}></span>
              <span className={clsx(styles.dot, styles.dotYellow, 'dot dot-yellow')}></span>
              <span className={clsx(styles.dot, styles.dotGreen, 'dot dot-green')}></span>
            </div>
            <span className={clsx(styles.codeCardTitle, 'code-card-title')}>nanko-platform.nanko</span>
          </div>
          <pre className={clsx(styles.codeBlock, 'code-block')}>
            <code>{NANKO_CODE_PREVIEW}</code>
          </pre>
        </div>
      </div>

      {/* Piliers Nanko */}
      <section className={clsx(styles.portalTenets, 'portal-tenets')} data-qa="portal-tenets">
        <div className={clsx(styles.tenetItem, 'tenet-item')}>
          <span className={clsx(styles.tenetCheck, 'tenet-check')} aria-hidden="true">&#x2713;</span>
          <span className="tenet-text">Base de données source de vérité</span>
        </div>
        <div className={clsx(styles.tenetItem, 'tenet-item')}>
          <span className={clsx(styles.tenetCheck, 'tenet-check')} aria-hidden="true">&#x2713;</span>
          <span className="tenet-text">Rendu déterministe C4</span>
        </div>
        <div className={clsx(styles.tenetItem, 'tenet-item')}>
          <span className={clsx(styles.tenetCheck, 'tenet-check')} aria-hidden="true">&#x2713;</span>
          <span className="tenet-text">Navigation multi-layer</span>
        </div>
      </section>
    </div>
  )
}

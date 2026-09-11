import React from 'react'
import clsx from 'clsx'
import { type NankoAst } from '../schemas'
import styles from './AstInspector.module.css'

export interface AstInspectorProps {
  ast?: NankoAst | null
  syntaxError?: string | null
}

export const AstInspector: React.FC<AstInspectorProps> = ({ ast, syntaxError }) => {
  const shapes = ast?.shapes ?? []
  const connectors = ast?.connectors ?? []

  return (
    <div className={clsx(styles.astInspectorPanel, 'ast-inspector-panel')} data-qa="ast-inspector">
      {/* En-tête */}
      <div className={clsx(styles.astInspectorHeader, 'ast-inspector-header')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={clsx(styles.astInspectorTitle, 'ast-inspector-title')}>Inspecteur AST</span>
          <span className={clsx(styles.astVersionBadge, 'ast-version-badge text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono')} data-qa="ast-dsl-version">
            DSL v{ast?.dslVersion ?? 1}
          </span>
        </div>
        {syntaxError ? (
          <span className={clsx(styles.astSyntaxPill, styles.invalid, 'ast-syntax-pill invalid')}>
            Erreur syntaxe
          </span>
        ) : (
          <span className={clsx(styles.astSyntaxPill, styles.valid, 'ast-syntax-pill valid')}>
            ✓ Syntaxe valide
          </span>
        )}
      </div>

      <div className={clsx(styles.astInspectorBody, 'ast-inspector-body')}>
        {/* Alerte erreur de syntaxe */}
        {syntaxError && (
          <div
            className={clsx(styles.syntaxErrorCard, 'syntax-error-card')}
            role="alert"
            data-qa="syntax-error-alert"
          >
            <div className={clsx(styles.syntaxErrorHeader, 'syntax-error-header')}>
              <span>⚠️</span>
              <span>Erreur de syntaxe .nanko</span>
            </div>
            <p style={{ margin: 0 }}>{syntaxError}</p>
          </div>
        )}

        {/* Section Shapes */}
        <div>
          <div className={clsx(styles.astSectionHeader, 'ast-section-header')}>
            <span className={clsx(styles.astSectionTitle, 'ast-section-title')}>Shapes</span>
            <span className={clsx(styles.astSectionCount, 'ast-section-count')}>{shapes.length}</span>
          </div>

          {shapes.length === 0 ? (
            <p className={clsx(styles.astEmptyHint, 'ast-empty-hint')}>Aucune Shape déclarée.</p>
          ) : (
            <div className={clsx(styles.astItemsList, 'ast-items-list')} data-qa="ast-shapes-list">
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  className={clsx(styles.astCardShape, 'ast-card-shape')}
                  data-qa={`ast-shape-${shape.id}`}
                >
                  <div className={clsx(styles.astShapeInfo, 'ast-shape-info')}>
                    <span className={clsx(styles.astShapeId, 'ast-shape-id')}>{shape.id}</span>
                    <span className={clsx(styles.astShapeLabel, 'ast-shape-label')}>&ldquo;{shape.label}&rdquo;</span>
                    {shape.desc && (
                      <span className={clsx(styles.astShapeDesc, 'ast-shape-desc text-xs text-slate-400 block mt-0.5')}>
                        {shape.desc}
                      </span>
                    )}
                  </div>
                  <span className={clsx(styles.astShapeTypeBadge, 'ast-shape-type-badge')}>{shape.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Connecteurs */}
        <div>
          <div className={clsx(styles.astSectionHeader, 'ast-section-header')}>
            <span className={clsx(styles.astSectionTitle, 'ast-section-title')}>Connecteurs</span>
            <span className={clsx(styles.astSectionCount, 'ast-section-count')}>{connectors.length}</span>
          </div>

          {connectors.length === 0 ? (
            <p className={clsx(styles.astEmptyHint, 'ast-empty-hint')}>Aucun connecteur déclaré.</p>
          ) : (
            <div className={clsx(styles.astItemsList, 'ast-items-list')} data-qa="ast-connectors-list">
              {connectors.map((conn, idx) => (
                <div
                  key={`${conn.source}-${conn.target}-${idx}`}
                  className={clsx(styles.astCardConnector, 'ast-card-connector')}
                  data-qa={`ast-connector-${conn.source}-${conn.target}`}
                >
                  <div className={clsx(styles.astConnectorFlow, 'ast-connector-flow')}>
                    <span>{conn.source}</span>
                    <span className={clsx(styles.connectorArrow, 'connector-arrow')}>&rarr;</span>
                    <span>{conn.target}</span>
                  </div>
                  {conn.label && (
                    <p className={clsx(styles.astConnectorLabel, 'ast-connector-label')}>&ldquo;{conn.label}&rdquo;</p>
                  )}
                  {conn.desc && (
                    <p className={clsx(styles.astConnectorDesc, 'ast-connector-desc text-xs text-slate-400 mt-0.5')}>{conn.desc}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

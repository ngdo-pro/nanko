import React from 'react'
import { type NankoAst } from '../schemas'

export interface AstInspectorProps {
  ast?: NankoAst | null
  syntaxError?: string | null
}

export const AstInspector: React.FC<AstInspectorProps> = ({ ast, syntaxError }) => {
  const shapes = ast?.shapes ?? []
  const connectors = ast?.connectors ?? []

  return (
    <div className="ast-inspector-panel" data-qa="ast-inspector">
      {/* En-tête */}
      <div className="ast-inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="ast-inspector-title">Inspecteur AST</span>
          <span className="ast-version-badge text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono" data-qa="ast-dsl-version">
            DSL v{ast?.dslVersion ?? 1}
          </span>
        </div>
        {syntaxError ? (
          <span className="ast-syntax-pill invalid">
            Erreur syntaxe
          </span>
        ) : (
          <span className="ast-syntax-pill valid">
            ✓ Syntaxe valide
          </span>
        )}
      </div>

      <div className="ast-inspector-body">
        {/* Alerte erreur de syntaxe */}
        {syntaxError && (
          <div
            className="syntax-error-card"
            role="alert"
            data-qa="syntax-error-alert"
          >
            <div className="syntax-error-header">
              <span>⚠️</span>
              <span>Erreur de syntaxe .nanko</span>
            </div>
            <p style={{ margin: 0 }}>{syntaxError}</p>
          </div>
        )}

        {/* Section Shapes */}
        <div>
          <div className="ast-section-header">
            <span className="ast-section-title">Shapes</span>
            <span className="ast-section-count">{shapes.length}</span>
          </div>

          {shapes.length === 0 ? (
            <p className="ast-empty-hint">Aucune Shape déclarée.</p>
          ) : (
            <div className="ast-items-list" data-qa="ast-shapes-list">
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  className="ast-card-shape"
                  data-qa={`ast-shape-${shape.id}`}
                >
                  <div className="ast-shape-info">
                    <span className="ast-shape-id">{shape.id}</span>
                    <span className="ast-shape-label">&ldquo;{shape.label}&rdquo;</span>
                    {shape.desc && (
                      <span className="ast-shape-desc text-xs text-slate-400 block mt-0.5">
                        {shape.desc}
                      </span>
                    )}
                  </div>
                  <span className="ast-shape-type-badge">{shape.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Connecteurs */}
        <div>
          <div className="ast-section-header">
            <span className="ast-section-title">Connecteurs</span>
            <span className="ast-section-count">{connectors.length}</span>
          </div>

          {connectors.length === 0 ? (
            <p className="ast-empty-hint">Aucun connecteur déclaré.</p>
          ) : (
            <div className="ast-items-list" data-qa="ast-connectors-list">
              {connectors.map((conn, idx) => (
                <div
                  key={`${conn.source}-${conn.target}-${idx}`}
                  className="ast-card-connector"
                  data-qa={`ast-connector-${conn.source}-${conn.target}`}
                >
                  <div className="ast-connector-flow">
                    <span>{conn.source}</span>
                    <span className="connector-arrow">&rarr;</span>
                    <span>{conn.target}</span>
                  </div>
                  {conn.label && (
                    <p className="ast-connector-label">&ldquo;{conn.label}&rdquo;</p>
                  )}
                  {conn.desc && (
                    <p className="ast-connector-desc text-xs text-slate-400 mt-0.5">{conn.desc}</p>
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

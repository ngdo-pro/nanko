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
    <div className="h-full flex flex-col p-4 bg-slate-900 border border-slate-800 rounded-lg overflow-y-auto" data-qa="ast-inspector">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <h3 className="font-semibold text-sm text-slate-200 uppercase tracking-wider">
          Inspecteur AST
        </h3>
        {syntaxError ? (
          <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
            Erreur syntaxe
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            ✓ Syntaxe valide
          </span>
        )}
      </div>

      {syntaxError && (
        <div
          className="p-3 mb-4 rounded bg-red-950/70 border border-red-800/80 text-red-200 text-xs leading-relaxed"
          role="alert"
          data-qa="syntax-error-alert"
        >
          <div className="font-semibold mb-1 flex items-center gap-1.5 text-red-400">
            <span>⚠️</span> Erreur de syntaxe .nanko
          </div>
          <p>{syntaxError}</p>
        </div>
      )}

      {/* Shapes Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">
            Shapes ({shapes.length})
          </h4>
        </div>
        {shapes.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune Shape déclarée.</p>
        ) : (
          <div className="space-y-2">
            {shapes.map((shape) => (
              <div
                key={shape.id}
                className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                data-qa={`ast-shape-${shape.id}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-slate-300 font-semibold">{shape.id}</span>
                  <span className="text-slate-400 truncate">&ldquo;{shape.label}&rdquo;</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                  {shape.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connectors Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">
            Connecteurs ({connectors.length})
          </h4>
        </div>
        {connectors.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucun connecteur déclaré.</p>
        ) : (
          <div className="space-y-2">
            {connectors.map((conn, idx) => (
              <div
                key={`${conn.source}-${conn.target}-${idx}`}
                className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs"
                data-qa={`ast-connector-${conn.source}-${conn.target}`}
              >
                <div className="flex items-center gap-1.5 font-mono text-slate-300">
                  <span>{conn.source}</span>
                  <span className="text-brand">&rarr;</span>
                  <span>{conn.target}</span>
                </div>
                {conn.label && (
                  <p className="text-slate-400 text-[11px] mt-1 italic">&ldquo;{conn.label}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

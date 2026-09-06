import React from 'react'

export type LayoutMode = 'split' | 'canvas' | 'code'

interface LayoutSelectorProps {
  mode: LayoutMode
  onChange: (mode: LayoutMode) => void
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({ mode, onChange }) => {
  return (
    <div className="layout-selector-group" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={`layout-selector-btn ${mode === 'split' ? 'is-active' : ''}`}
        onClick={() => onChange('split')}
        data-qa="layout-mode-split"
        title="Vue partagée : Code à gauche, Canvas à droite"
      >
        Split
      </button>
      <button
        type="button"
        className={`layout-selector-btn ${mode === 'canvas' ? 'is-active' : ''}`}
        onClick={() => onChange('canvas')}
        data-qa="layout-mode-canvas"
        title="Canvas plein écran"
      >
        Canvas
      </button>
      <button
        type="button"
        className={`layout-selector-btn ${mode === 'code' ? 'is-active' : ''}`}
        onClick={() => onChange('code')}
        data-qa="layout-mode-code"
        title="Code plein écran"
      >
        Code
      </button>
    </div>
  )
}

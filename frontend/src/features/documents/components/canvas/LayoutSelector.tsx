import React from 'react'
import clsx from 'clsx'
import styles from './LayoutSelector.module.css'

export type LayoutMode = 'split' | 'canvas' | 'code'

interface LayoutSelectorProps {
  mode: LayoutMode
  onChange: (mode: LayoutMode) => void
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({ mode, onChange }) => {
  return (
    <div className={clsx(styles.layoutSelectorGroup, 'layout-selector-group')} role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={clsx(styles.layoutSelectorBtn, 'layout-selector-btn', mode === 'split' && [styles.isActive, 'is-active'])}
        onClick={() => onChange('split')}
        data-qa="layout-mode-split"
        title="Vue partagée : Code à gauche, Canvas à droite"
      >
        Split
      </button>
      <button
        type="button"
        className={clsx(styles.layoutSelectorBtn, 'layout-selector-btn', mode === 'canvas' && [styles.isActive, 'is-active'])}
        onClick={() => onChange('canvas')}
        data-qa="layout-mode-canvas"
        title="Canvas plein écran"
      >
        Canvas
      </button>
      <button
        type="button"
        className={clsx(styles.layoutSelectorBtn, 'layout-selector-btn', mode === 'code' && [styles.isActive, 'is-active'])}
        onClick={() => onChange('code')}
        data-qa="layout-mode-code"
        title="Code plein écran"
      >
        Code
      </button>
    </div>
  )
}

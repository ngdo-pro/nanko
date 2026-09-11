import React from 'react'
import { useReactFlow } from '@xyflow/react'
import clsx from 'clsx'
import styles from './CanvasControls.module.css'

interface CanvasControlsProps {
  onAutoLayout?: () => void
  showMiniMap?: boolean
  onToggleMiniMap?: () => void
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  onAutoLayout,
  showMiniMap,
  onToggleMiniMap,
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className={clsx(styles.canvasCustomControls, 'canvas-custom-controls')} data-qa="canvas-controls">
      {onAutoLayout && (
        <button
          type="button"
          className={clsx(styles.canvasControlBtn, styles.btnAutoLayout, 'canvas-control-btn btn-auto-layout')}
          onClick={onAutoLayout}
          data-qa="auto-layout-button"
          title="Réorganiser automatiquement le graphe (Auto-Layout)"
        >
          <span className={clsx(styles.controlIcon, 'control-icon')}>⟳</span>
          <span>Réorganiser</span>
        </button>
      )}

      <div className={clsx(styles.canvasControlDivider, 'canvas-control-divider')} />

      <button
        type="button"
        className={clsx(styles.canvasControlBtn, 'canvas-control-btn')}
        onClick={() => zoomIn({ duration: 200 })}
        data-qa="canvas-zoom-in"
        title="Zoom avant"
      >
        +
      </button>
      <button
        type="button"
        className={clsx(styles.canvasControlBtn, 'canvas-control-btn')}
        onClick={() => zoomOut({ duration: 200 })}
        data-qa="canvas-zoom-out"
        title="Zoom arrière"
      >
        −
      </button>
      <button
        type="button"
        className={clsx(styles.canvasControlBtn, 'canvas-control-btn')}
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        data-qa="canvas-fit-view"
        title="Recentrer la vue (Fit view)"
      >
        ⛶
      </button>

      {onToggleMiniMap && (
        <button
          type="button"
          className={clsx(styles.canvasControlBtn, 'canvas-control-btn', showMiniMap && [styles.isActive, 'is-active'])}
          onClick={onToggleMiniMap}
          data-qa="toggle-minimap-button"
          title="Afficher/Masquer la MiniMap"
        >
          Map
        </button>
      )}
    </div>
  )
}

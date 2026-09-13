import React, { useEffect, useRef } from 'react'
import clsx from 'clsx'
import type { ShapePrimitiveType } from '../utils/insertShapeToSource'
import styles from './QuickSpawnMenu.module.css'

export interface QuickSpawnMenuProps {
  x: number
  y: number
  onSelect: (type: ShapePrimitiveType) => void
  onCancel: () => void
}

export const QuickSpawnMenu: React.FC<QuickSpawnMenuProps> = ({
  x,
  y,
  onSelect,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Écouteur clavier : R pour rectangle, C pour cercle, Escape pour annuler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si la frappe a lieu dans un champ texte de saisie
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        e.stopPropagation()
        onSelect('rectangle')
        return
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        e.stopPropagation()
        onSelect('circle')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [onSelect, onCancel])

  // Clic extérieur pour annuler
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [onCancel])

  return (
    <div
      ref={containerRef}
      className={clsx(styles.quickSpawnMenu, 'nodrag', 'nopan', 'quick-spawn-menu')}
      style={{ left: x, top: y }}
      data-qa="quick-spawn-menu"
      data-testid="quick-spawn-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={clsx(styles.optionButton, 'quick-spawn-opt-rectangle')}
        onClick={() => onSelect('rectangle')}
        data-qa="quick-spawn-rectangle"
        data-testid="quick-spawn-rectangle"
      >
        <span className={clsx(styles.shapeIcon, styles.shapeIconRect)} />
        <span>Rectangle</span>
        <span className={styles.keyBadge}>R</span>
      </button>

      <button
        type="button"
        className={clsx(styles.optionButton, 'quick-spawn-opt-circle')}
        onClick={() => onSelect('circle')}
        data-qa="quick-spawn-circle"
        data-testid="quick-spawn-circle"
      >
        <span className={clsx(styles.shapeIcon, styles.shapeIconCircle)} />
        <span>Cercle</span>
        <span className={styles.keyBadge}>C</span>
      </button>
    </div>
  )
}

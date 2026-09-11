import React, { useState, useCallback } from 'react'
import clsx from 'clsx'
import type { ShapePrimitiveType } from '../utils/insertShapeToSource'
import {
  SECTORS,
  CENTER_X,
  CENTER_Y,
  INNER_RADIUS,
  OUTER_RADIUS,
  describeArc,
} from './radialMenuConfig'
import styles from './RadialMenu.module.css'

export interface RadialMenuProps {
  x: number
  y: number
  onSelect: (shapeType: ShapePrimitiveType) => void
  onHoverSector?: (shapeType: ShapePrimitiveType | null) => void
  onClose?: () => void
}

export const RadialMenu: React.FC<RadialMenuProps> = ({ x, y, onSelect, onHoverSector, onClose }) => {
  const [hoveredType, setHoveredType] = useState<ShapePrimitiveType | null>(null)

  const handleSelect = useCallback(
    (type: ShapePrimitiveType, e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(type)
    },
    [onSelect],
  )

  const handleMouseEnterSector = useCallback(
    (type: ShapePrimitiveType) => {
      setHoveredType(type)
      onHoverSector?.(type)
    },
    [onHoverSector],
  )

  const handleMouseLeaveSector = useCallback(() => {
    setHoveredType(null)
    onHoverSector?.(null)
  }, [onHoverSector])

  const handleCenterClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose?.()
    },
    [onClose],
  )

  const handleCenterMouseEnter = useCallback(() => {
    setHoveredType(null)
    onHoverSector?.(null)
  }, [onHoverSector])

  return (
    <div
      className={clsx(styles.radialMenuOverlay, 'radial-menu-overlay')}
      style={{ left: `${x}px`, top: `${y}px` }}
      data-qa="radial-menu"
      onContextMenu={(e) => e.preventDefault()}
      onMouseLeave={() => onHoverSector?.(null)}
    >
      <svg
        className={clsx(styles.radialMenuSvg, 'radial-menu-svg')}
        viewBox="0 0 200 200"
        width="200"
        height="200"
      >
        <defs>
          <filter id="radial-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Secteurs découpés */}
        {SECTORS.map((sector) => {
          const isHovered = hoveredType === sector.type
          const pathD = describeArc(
            CENTER_X,
            CENTER_Y,
            INNER_RADIUS,
            OUTER_RADIUS,
            sector.startAngle,
            sector.endAngle,
          )

          return (
            <g
              key={sector.type}
              className={clsx(styles.radialSector, 'radial-sector', isHovered && [styles.isHovered, 'is-hovered'])}
              data-qa={sector.dataQa}
              onClick={(e) => handleSelect(sector.type, e)}
              onMouseEnter={() => handleMouseEnterSector(sector.type)}
              onMouseLeave={handleMouseLeaveSector}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(sector.type)
                }
              }}
            >
              <path
                d={pathD}
                className={clsx(styles.radialSectorPath, 'radial-sector-path')}
              />

              {/* Icône & Libellé */}
              <g transform={`translate(${sector.centerPos.x}, ${sector.centerPos.y})`} className={clsx(styles.radialSectorContent, 'radial-sector-content')}>
                {sector.type === 'rectangle' && (
                  <rect x="-9" y="-12" width="18" height="12" rx="2" className={clsx(styles.radialIcon, 'radial-icon')} />
                )}
                {sector.type === 'circle' && (
                  <circle cx="0" cy="-6" r="7" className={clsx(styles.radialIcon, 'radial-icon')} />
                )}

                <text x="0" y="9" textAnchor="middle" className={clsx(styles.radialLabel, 'radial-label')}>
                  {sector.label}
                </text>
                <text x="0" y="17" textAnchor="middle" className={clsx(styles.radialShortcut, 'radial-shortcut')}>
                  [{sector.shortcut}]
                </text>
              </g>
            </g>
          )
        })}

        {/* Pastille centrale */}
        <g
          className={clsx(styles.radialCenterButton, 'radial-center-button')}
          onClick={handleCenterClick}
          onMouseEnter={handleCenterMouseEnter}
          data-qa="radial-center-cancel"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
              onClose?.()
            }
          }}
        >
          <circle cx={CENTER_X} cy={CENTER_Y} r={INNER_RADIUS - 3} className={clsx(styles.radialCenterCircle, 'radial-center-circle')} />
          <text x={CENTER_X} y={CENTER_Y + 4} textAnchor="middle" className={clsx(styles.radialCenterText, 'radial-center-text')}>
            ×
          </text>
        </g>
      </svg>
    </div>
  )
}

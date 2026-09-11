import React, { useRef, useState, useEffect } from 'react'
import clsx from 'clsx'
import styles from './BlueprintTooltip.module.css'

export interface BlueprintTooltipProps {
  typeBadge?: string
  id?: string
  title?: string
  desc?: string | null
  dataQa?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const BlueprintTooltip: React.FC<BlueprintTooltipProps> = ({
  typeBadge,
  id,
  title,
  desc,
  dataQa,
  onMouseEnter,
  onMouseLeave,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const descRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      if (rect.top < 10) {
        setIsFlipped(true)
      }
    }
  }, [])

  useEffect(() => {
    if (descRef.current) {
      const hasOverflow = descRef.current.scrollHeight > descRef.current.clientHeight
      if (hasOverflow || (desc && desc.length > 120)) {
        setIsScrollable(true)
      }
    }
  }, [desc])

  if (!desc) {
    return null
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    onMouseEnter?.()
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onMouseLeave?.()
  }

  return (
    <div
      ref={tooltipRef}
      className={clsx(
        styles.nankoBlueprintTooltip,
        'nanko-blueprint-tooltip nodrag nopan nowheel',
        isFlipped && [styles.isFlipped, 'is-flipped'],
      )}
      role="tooltip"
      data-qa={dataQa}
      data-testid={dataQa}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {(typeBadge || id) && (
        <div className={clsx(styles.nankoBlueprintTooltipHeader, 'nanko-blueprint-tooltip-header')}>
          {typeBadge && <span className={clsx(styles.nankoNodeBadge, 'nanko-node-badge')}>{typeBadge}</span>}
          {id && <span className={clsx(styles.nankoNodeId, 'nanko-node-id')}>{id}</span>}
        </div>
      )}
      {title && <div className={clsx(styles.nankoBlueprintTooltipTitle, 'nanko-blueprint-tooltip-title')}>{title}</div>}
      <div
        ref={descRef}
        className={clsx(styles.nankoBlueprintTooltipDesc, 'nanko-blueprint-tooltip-desc nodrag nowheel')}
        onWheel={(e) => e.stopPropagation()}
      >
        {desc}
      </div>
      {isScrollable && (
        <div className={clsx(styles.nankoBlueprintTooltipFooter, 'nanko-blueprint-tooltip-footer')} data-qa="tooltip-scroll-indicator">
          <div className={clsx(styles.nankoBlueprintTooltipLockTrack, 'nanko-blueprint-tooltip-lock-track')}>
            <div className={clsx(styles.nankoBlueprintTooltipLockBar, 'nanko-blueprint-tooltip-lock-bar', isHovered && [styles.isActive, 'is-active'])} />
          </div>
          <span className={clsx(styles.nankoBlueprintTooltipHint, 'nanko-blueprint-tooltip-hint')}>
            {isHovered ? '↕ Défilement actif' : '↕ Survolez pour faire défiler'}
          </span>
        </div>
      )}
    </div>
  )
}

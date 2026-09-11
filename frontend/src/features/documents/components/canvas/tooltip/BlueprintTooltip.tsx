import React, { useRef, useState, useEffect } from 'react'

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
      className={`nanko-blueprint-tooltip nodrag nopan nowheel ${isFlipped ? 'is-flipped' : ''}`}
      role="tooltip"
      data-qa={dataQa}
      data-testid={dataQa}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {(typeBadge || id) && (
        <div className="nanko-blueprint-tooltip-header">
          {typeBadge && <span className="nanko-node-badge">{typeBadge}</span>}
          {id && <span className="nanko-node-id">{id}</span>}
        </div>
      )}
      {title && <div className="nanko-blueprint-tooltip-title">{title}</div>}
      <div
        ref={descRef}
        className="nanko-blueprint-tooltip-desc nodrag nowheel"
        onWheel={(e) => e.stopPropagation()}
      >
        {desc}
      </div>
      {isScrollable && (
        <div className="nanko-blueprint-tooltip-footer" data-qa="tooltip-scroll-indicator">
          <div className="nanko-blueprint-tooltip-lock-track">
            <div className={`nanko-blueprint-tooltip-lock-bar ${isHovered ? 'is-active' : ''}`} />
          </div>
          <span className="nanko-blueprint-tooltip-hint">
            {isHovered ? '↕ Défilement actif' : '↕ Survolez pour faire défiler'}
          </span>
        </div>
      )}
    </div>
  )
}

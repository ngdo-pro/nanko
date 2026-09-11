import React, { useRef, useState, useEffect } from 'react'

export interface BlueprintTooltipProps {
  typeBadge?: string
  id?: string
  title?: string
  desc?: string | null
  dataQa?: string
}

export const BlueprintTooltip: React.FC<BlueprintTooltipProps> = ({
  typeBadge,
  id,
  title,
  desc,
  dataQa,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      if (rect.top < 10) {
        setIsFlipped(true)
      }
    }
  }, [])

  if (!desc) {
    return null
  }

  return (
    <div
      ref={tooltipRef}
      className={`nanko-blueprint-tooltip ${isFlipped ? 'is-flipped' : ''}`}
      role="tooltip"
      data-qa={dataQa}
      data-testid={dataQa}
    >
      {(typeBadge || id) && (
        <div className="nanko-blueprint-tooltip-header">
          {typeBadge && <span className="nanko-node-badge">{typeBadge}</span>}
          {id && <span className="nanko-node-id">{id}</span>}
        </div>
      )}
      {title && <div className="nanko-blueprint-tooltip-title">{title}</div>}
      <div className="nanko-blueprint-tooltip-desc">{desc}</div>
    </div>
  )
}

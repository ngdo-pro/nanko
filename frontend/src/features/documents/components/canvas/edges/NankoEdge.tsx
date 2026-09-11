import React from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react'
import clsx from 'clsx'
import { BlueprintTooltip } from '../tooltip/BlueprintTooltip'
import { useHoverTooltip } from '../tooltip/useHoverTooltip'
import styles from './NankoEdge.module.css'

export const NankoEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // Coins droits pour le look Blueprint
  })

  const edgeData = data as { label?: string | null; desc?: string | null } | undefined
  const edgeLabel = (label as string) || (edgeData?.label as string) || ''
  const edgeDesc = edgeData?.desc || null
  const {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useHoverTooltip(300)

  const hasBadge = Boolean(edgeLabel || edgeDesc)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: 'var(--structure, #5EEAD4)',
          strokeWidth: 1.5,
          ...style,
        }}
      />
      {hasBadge && (
        <EdgeLabelRenderer>
          <div
            className={clsx(styles.edgeLabelContainer, edgeLabel && styles.hasLabel, 'nanko-edge-label-container')}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'auto',
            }}
            data-qa={`ast-connector-${source}-${target}`}
            data-testid={`ast-connector-${source}-${target}`}
            onMouseEnter={edgeDesc ? handleMouseEnter : undefined}
            onMouseLeave={edgeDesc ? handleMouseLeave : undefined}
          >
            <div className={clsx(styles.edgeLabel, 'nanko-edge-label')}>
              {edgeLabel ? (
                <span
                  className={clsx(styles.edgeLabelText, 'nanko-edge-label-text')}
                  data-qa={`canvas-edge-label-${source}-${target}`}
                >
                  {edgeLabel}
                </span>
              ) : null}
              {edgeDesc ? (
                <span
                  className={clsx(styles.edgeDescIndicator, 'nanko-edge-desc-indicator')}
                  data-qa={`edge-desc-indicator-${source}-${target}`}
                >
                  {' '}•
                </span>
              ) : null}
            </div>

            {isVisible && edgeDesc && (
              <BlueprintTooltip
                typeBadge="connector"
                id={`${source} → ${target}`}
                title={edgeLabel || undefined}
                desc={edgeDesc}
                dataQa={`edge-tooltip-${source}-${target}`}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
              />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

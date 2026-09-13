import React from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from '@xyflow/react'
import clsx from 'clsx'
import { BlueprintTooltip } from '../tooltip/BlueprintTooltip'
import { useHoverTooltip } from '../tooltip/useHoverTooltip'
import { applyLineJumpsToPath, type LineJumpDescriptor } from '../utils/lineJumps'
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
  const [edgePath, defaultLabelX, defaultLabelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // Coins droits pour le look Blueprint
  })

  // Positionnement déterministe à 36px de la source le long du tracé (INV-6)
  const dist = Math.hypot(targetX - sourceX, targetY - sourceY)
  let badgeX = defaultLabelX
  let badgeY = defaultLabelY

  if (dist >= 72) {
    switch (sourcePosition) {
      case Position.Right:
        badgeX = sourceX + 36
        badgeY = sourceY
        break
      case Position.Left:
        badgeX = sourceX - 36
        badgeY = sourceY
        break
      case Position.Bottom:
        badgeX = sourceX
        badgeY = sourceY + 36
        break
      case Position.Top:
        badgeX = sourceX
        badgeY = sourceY - 36
        break
    }
  }

  const edgeData = data as {
    label?: string | null
    desc?: string | null
    sourceContactOffset?: { dx: number; dy: number }
    targetContactOffset?: { dx: number; dy: number }
    jumps?: LineJumpDescriptor[]
  } | undefined
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

  let finalPath = edgePath
  if (edgeData?.jumps && edgeData.jumps.length > 0) {
    finalPath = applyLineJumpsToPath(finalPath, edgeData.jumps)
  }

  const targetOffset = edgeData?.targetContactOffset
  const sourceOffset = edgeData?.sourceContactOffset

  if (targetOffset && (targetOffset.dx !== 0 || targetOffset.dy !== 0)) {
    finalPath = `${finalPath} L ${targetX + targetOffset.dx} ${targetY + targetOffset.dy}`
  }

  if (sourceOffset && (sourceOffset.dx !== 0 || sourceOffset.dy !== 0)) {
    const sx = sourceX + sourceOffset.dx
    const sy = sourceY + sourceOffset.dy
    const restOfPath = finalPath.replace(/^M\s*[-0-9.]+[,\s]+[-0-9.]+/, '')
    finalPath = `M ${sx} ${sy} L ${sourceX} ${sourceY}${restOfPath}`
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={finalPath}
        markerEnd={markerEnd}
        style={{
          stroke: 'var(--brand)',
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
              transform: `translate(-50%, -50%) translate(${badgeX}px,${badgeY}px)`,
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
                  className="nanko-edge-label-text"
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

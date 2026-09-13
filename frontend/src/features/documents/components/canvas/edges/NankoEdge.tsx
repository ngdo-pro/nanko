import React, { useState, useRef } from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import clsx from 'clsx'
import { BlueprintTooltip } from '../tooltip/BlueprintTooltip'
import { useHoverTooltip } from '../tooltip/useHoverTooltip'
import { applyLineJumpsToPath, type LineJumpDescriptor } from '../utils/lineJumps'
import { projectPointOnEdgePath } from '../utils/edgeLabelGeometry'
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
  const reactFlow = useReactFlow()
  const [edgePath, defaultLabelX, defaultLabelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // Coins droits pour le look Blueprint
  })

  const edgeData = data as {
    label?: string | null
    desc?: string | null
    sourceContactOffset?: { dx: number; dy: number }
    targetContactOffset?: { dx: number; dy: number }
    jumps?: LineJumpDescriptor[]
    customLabelPosition?: { x: number; y: number } | null
    onLabelPositionChange?: (edgeId: string, position: { x: number; y: number }) => void
    onLabelPositionReset?: (edgeId: string) => void
  } | undefined

  const {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useHoverTooltip(300)

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

  // Positionnement : coordonnées personnalisées dans !LAYOUT si définies, sinon déterministe à 36px (INV-6)
  let rawBadgeX = defaultLabelX
  let rawBadgeY = defaultLabelY

  const customPos = edgeData?.customLabelPosition
  if (customPos && typeof customPos.x === 'number' && typeof customPos.y === 'number') {
    rawBadgeX = customPos.x
    rawBadgeY = customPos.y
  } else {
    const dist = Math.hypot(targetX - sourceX, targetY - sourceY)
    if (dist >= 72) {
      switch (sourcePosition) {
        case Position.Right:
          rawBadgeX = sourceX + 36
          rawBadgeY = sourceY
          break
        case Position.Left:
          rawBadgeX = sourceX - 36
          rawBadgeY = sourceY
          break
        case Position.Bottom:
          rawBadgeX = sourceX
          rawBadgeY = sourceY + 36
          break
        case Position.Top:
          rawBadgeX = sourceX
          rawBadgeY = sourceY - 36
          break
      }
    }
  }

  // Projection géométrique : le badge reste toujours rigoureusement centré sur le tracé orthogonal du connecteur
  const basePoint = projectPointOnEdgePath({ x: rawBadgeX, y: rawBadgeY }, finalPath)
  const baseBadgeX = basePoint.x
  const baseBadgeY = basePoint.y

  // Gestion du drag interactif contraint le long du connecteur
  const [draggedPos, setDraggedPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)

  const displayedBadgeX = draggedPos ? draggedPos.x : baseBadgeX
  const displayedBadgeY = draggedPos ? draggedPos.y : baseBadgeY

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: baseBadgeX,
      startY: baseBadgeY,
    }
    setIsDragging(true)
    setDraggedPos(null)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    e.stopPropagation()
    const zoom = reactFlow?.getViewport?.()?.zoom || 1
    const currentZoom = zoom > 0 ? zoom : 1
    const dx = (e.clientX - dragStartRef.current.clientX) / currentZoom
    const dy = (e.clientY - dragStartRef.current.clientY) / currentZoom
    const unconstrainedX = dragStartRef.current.startX + dx
    const unconstrainedY = dragStartRef.current.startY + dy

    // Projection stricte sur le trait du connecteur
    const constrainedPoint = projectPointOnEdgePath(
      { x: unconstrainedX, y: unconstrainedY },
      finalPath,
    )
    setDraggedPos(constrainedPoint)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    e.stopPropagation()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    const finalX = draggedPos?.x ?? baseBadgeX
    const finalY = draggedPos?.y ?? baseBadgeY
    const moved = Math.hypot(finalX - dragStartRef.current.startX, finalY - dragStartRef.current.startY)

    dragStartRef.current = null
    setIsDragging(false)
    setDraggedPos(null)

    if (moved >= 3) {
      edgeData?.onLabelPositionChange?.(id, { x: finalX, y: finalY })
    }
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    edgeData?.onLabelPositionReset?.(id)
  }

  const edgeLabel = (label as string) || (edgeData?.label as string) || ''
  const edgeDesc = edgeData?.desc || null
  const hasBadge = Boolean(edgeLabel || edgeDesc)

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
            className={clsx(
              styles.edgeLabelContainer,
              edgeLabel && styles.hasLabel,
              'nanko-edge-label-container',
              'nodrag',
            )}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${displayedBadgeX}px,${displayedBadgeY}px)`,
              pointerEvents: 'auto',
            }}
            data-qa={`ast-connector-${source}-${target}`}
            data-testid={`ast-connector-${source}-${target}`}
            onMouseEnter={edgeDesc && !isDragging ? handleMouseEnter : undefined}
            onMouseLeave={edgeDesc && !isDragging ? handleMouseLeave : undefined}
          >
            <div
              className={clsx(
                styles.edgeLabel,
                'nanko-edge-label',
                isDragging && styles.isDragging,
              )}
              data-qa={`edge-label-${source}-${target}`}
              data-testid={`edge-label-${source}-${target}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={handleDoubleClick}
            >
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

            {isVisible && edgeDesc && !isDragging && (
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

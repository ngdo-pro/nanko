import React from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react'

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

  const edgeLabel = (label as string) || (data?.label as string) || ''

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
      <EdgeLabelRenderer>
        <div
          className={`nanko-edge-label-container ${edgeLabel ? 'has-label' : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          data-qa={`ast-connector-${source}-${target}`}
        >
          <div className="nanko-edge-label">
            <span className="nanko-edge-flow-meta" style={{ marginRight: edgeLabel ? '6px' : '0', opacity: 0.8 }}>
              {source} &rarr; {target}
            </span>
            {edgeLabel ? (
              <span
                className="nanko-edge-label-text"
                data-qa={`canvas-edge-label-${source}-${target}`}
              >
                {edgeLabel}
              </span>
            ) : null}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

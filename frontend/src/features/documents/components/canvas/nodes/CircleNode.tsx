import React from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import clsx from 'clsx'
import type { NankoNodeData } from './RectangleNode'
import { BlueprintTooltip } from '../tooltip/BlueprintTooltip'
import { useHoverTooltip } from '../tooltip/useHoverTooltip'
import styles from './CircleNode.module.css'

export const CircleNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as NankoNodeData
  const label = nodeData?.label || id
  const desc = nodeData?.desc || null
  const displayId = nodeData?.nodeId || id
  const handles = nodeData?.handles ?? []
  const scale = nodeData?.scale
  const {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useHoverTooltip(300)

  return (
    <div
      className={clsx(
        styles.nodeCircle,
        selected && styles.isSelected,
        scale?.isCircleScaled && styles.isScaledDiameter,
      )}
      data-qa={`canvas-node-${id}`}
      data-testid={`canvas-node-${id}`}
      data-node-id={id}
      onMouseEnter={desc ? handleMouseEnter : undefined}
      onMouseLeave={desc ? handleMouseLeave : undefined}
    >
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="nanko-handle nanko-handle-left"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="nanko-handle nanko-handle-top"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="nanko-handle nanko-handle-right"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="nanko-handle nanko-handle-bottom"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="auto"
        isConnectableStart={false}
        isConnectableEnd={true}
        className="nanko-handle nanko-handle-auto"
      />

      {handles.map((h) => {
        const position =
          h.side === 'left'
            ? Position.Left
            : h.side === 'right'
              ? Position.Right
              : h.side === 'top'
                ? Position.Top
                : Position.Bottom

        const style: React.CSSProperties = {
          left: h.circleLeftPercentage !== undefined ? `${h.circleLeftPercentage}%` : undefined,
          top: h.circleTopPercentage !== undefined ? `${h.circleTopPercentage}%` : undefined,
        }

        return (
          <Handle
            key={h.id}
            type="source"
            position={position}
            id={h.id}
            isConnectableStart={true}
            isConnectableEnd={true}
            style={style}
            className={clsx(
              'nanko-handle',
              `nanko-handle-${h.side}`,
              'nanko-handle-distributed',
              'nanko-handle-circle-arc',
            )}
          />
        )
      })}

      <div className={styles.circleInner}>
        <div className={styles.nodeHeader}>
          <span className={clsx(styles.nodeBadge, 'nanko-node-badge')} data-qa="node-circle">circle</span>
          <span className={clsx(styles.nodeId, 'nanko-node-id')}>{displayId}</span>
        </div>
        <div className={styles.nodeBody} data-qa={`ast-shape-${id}`}>
          <span className={styles.nodeLabel} data-qa="node-label">{label}</span>
          {desc ? (
            <span className={clsx(styles.nodeDesc, 'nanko-node-desc')} data-qa="node-desc">{desc}</span>
          ) : null}
        </div>
      </div>

      {isVisible && desc && (
        <BlueprintTooltip
          typeBadge="circle"
          id={displayId}
          title={label}
          desc={desc}
          dataQa={`node-tooltip-${id}`}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </div>
  )
}

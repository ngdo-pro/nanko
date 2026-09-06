import React from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { NankoNodeData } from './RectangleNode'

export const TextNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as NankoNodeData
  const label = nodeData?.label || id
  const displayId = nodeData?.nodeId || id

  return (
    <div
      className={`nanko-node nanko-node-text ${selected ? 'is-selected' : ''}`}
      data-qa={`canvas-node-${id}`}
      data-node-id={id}
    >
      <Handle type="target" position={Position.Left} id="left" className="nanko-handle nanko-handle-left" />
      <Handle type="target" position={Position.Top} id="top" className="nanko-handle nanko-handle-top" />

      <div className="nanko-text-inner">
        <div className="nanko-node-header">
          <span className="nanko-node-badge" data-qa="node-text">text</span>
          <span className="nanko-node-id">{displayId}</span>
        </div>
        <div className="nanko-node-body" data-qa={`ast-shape-${id}`}>
          <span className="nanko-node-label" data-qa="node-label">{label}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="nanko-handle nanko-handle-right" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="nanko-handle nanko-handle-bottom" />
    </div>
  )
}

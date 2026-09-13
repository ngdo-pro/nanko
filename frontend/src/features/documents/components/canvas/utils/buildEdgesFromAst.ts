import { MarkerType, type Edge, type Node } from '@xyflow/react'
import {
  computeAnchorDistribution,
  type AnchorDistributionResult,
} from './anchorDistribution'
import { computeAstEdgeCrossovers } from './lineJumps'
import type { NankoAst } from '@/features/documents'

export function buildEdgesFromAst(
  ast: NankoAst,
  nodes: Node[],
  colorMode: 'dark' | 'light',
  precomputedDist?: AnchorDistributionResult,
  activeEdgeId?: string | null,
  onEdgeLabelPositionChange?: (edgeKey: string, position: { x: number; y: number }) => void,
  onEdgeLabelPositionReset?: (edgeKey: string) => void,
): Edge[] {
  const distribution = precomputedDist ?? computeAnchorDistribution(ast, nodes)
  const crossovers = computeAstEdgeCrossovers(ast, nodes, distribution, activeEdgeId)
  const edgeLayout = (ast?.edgeLayout ?? {}) as Record<
    string,
    { from?: string; to?: string; zIndex?: number | string; labelX?: number; labelY?: number }
  >

  return (ast?.connectors ?? []).map((connector, idx) => {
    const edgeKey = `${connector.source}->${connector.target}`
    const assignment = distribution.edgeAssignments.get(edgeKey)

    const sourceHandle = assignment?.sourceHandle ?? 'right'
    const targetHandle = assignment?.targetHandle ?? 'left'

    const layoutZ = edgeLayout[edgeKey]?.zIndex
    const explicitZ =
      typeof layoutZ === 'number'
        ? layoutZ
        : typeof layoutZ === 'string'
          ? parseInt(layoutZ, 10)
          : undefined
    const baseZ = explicitZ ?? idx + 1
    const zIndex = edgeKey === activeEdgeId ? 1000 : baseZ

    const lx = edgeLayout[edgeKey]?.labelX
    const ly = edgeLayout[edgeKey]?.labelY
    const customLabelPosition =
      typeof lx === 'number' && typeof ly === 'number' ? { x: lx, y: ly } : null

    return {
      id: edgeKey,
      source: connector.source,
      target: connector.target,
      sourceHandle,
      targetHandle,
      type: 'nanko',
      zIndex,
      label: connector.label ?? undefined,
      data: {
        label: connector.label,
        desc: connector.desc,
        sourceContactOffset: assignment?.sourceContactOffset,
        targetContactOffset: assignment?.targetContactOffset,
        jumps: crossovers.get(edgeKey) ?? [],
        customLabelPosition,
        onLabelPositionChange: onEdgeLabelPositionChange,
        onLabelPositionReset: onEdgeLabelPositionReset,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: colorMode === 'dark' ? '#5EEAD4' : '#2C4A3B',
      },
    }
  })
}

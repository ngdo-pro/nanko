import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

export const DEFAULT_NODE_WIDTH = 220
export const DEFAULT_NODE_HEIGHT = 80

export interface DagreLayoutOptions {
  direction?: 'LR' | 'TB' | 'RL' | 'BT'
  nodeWidth?: number
  nodeHeight?: number
}

/**
 * Calcule l'agencement spatial hiérarchique des nœuds et arêtes avec Dagre.
 */
export function calculateDagreLayout<T extends Record<string, unknown> = Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: DagreLayoutOptions = {},
): Node<T>[] {
  const { direction = 'LR', nodeWidth = DEFAULT_NODE_WIDTH, nodeHeight = DEFAULT_NODE_HEIGHT } = options

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
  })

  for (const node of nodes) {
    const isCircle = node.type === 'circle'
    const scale = (node.data as Record<string, unknown> | undefined)?.scale as
      | { isVerticalScaled?: boolean; isHorizontalScaled?: boolean; isCircleScaled?: boolean }
      | undefined

    let defaultW = isCircle ? 130 : nodeWidth
    let defaultH = isCircle ? 130 : nodeHeight

    if (scale?.isCircleScaled) {
      defaultW = 260
      defaultH = 260
    } else {
      if (scale?.isHorizontalScaled) defaultW *= 2
      if (scale?.isVerticalScaled) defaultH *= 2
    }

    const width = node.measured?.width ?? defaultW
    const height = node.measured?.height ?? defaultH
    dagreGraph.setNode(node.id, { width, height })
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target)
  }

  dagre.layout(dagreGraph)

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    const isCircle = node.type === 'circle'
    const scale = (node.data as Record<string, unknown> | undefined)?.scale as
      | { isVerticalScaled?: boolean; isHorizontalScaled?: boolean; isCircleScaled?: boolean }
      | undefined

    let defaultW = isCircle ? 130 : nodeWidth
    let defaultH = isCircle ? 130 : nodeHeight

    if (scale?.isCircleScaled) {
      defaultW = 260
      defaultH = 260
    } else {
      if (scale?.isHorizontalScaled) defaultW *= 2
      if (scale?.isVerticalScaled) defaultH *= 2
    }

    const width = node.measured?.width ?? defaultW
    const height = node.measured?.height ?? defaultH

    // Dagre positionne par rapport au centre, React Flow par rapport au coin supérieur gauche
    return {
      ...node,
      position: {
        x: Math.round(nodeWithPosition.x - width / 2),
        y: Math.round(nodeWithPosition.y - height / 2),
      },
    }
  })
}

import type { Node } from '@xyflow/react'
import type { CardinalAnchorSide, NodeBounds } from './connectorGeometry'
import { getOptimalConnectorSides, isCardinalSide } from './connectorGeometry'
import { getPerimeterContact } from './shapeGeometry'
import type { NankoAst } from '@/features/documents'

export const CAPACITY_THRESHOLD = 8

export interface DistributedHandleDescriptor {
  id: string
  side: CardinalAnchorSide
  offsetPercentage: number
  circleLeftPercentage?: number
  circleTopPercentage?: number
}

export interface NodeScaleState {
  isVerticalScaled: boolean
  isHorizontalScaled: boolean
  isCircleScaled: boolean
}

export interface ContactOffset {
  dx: number
  dy: number
}

export interface EdgeAnchorAssignment {
  sourceHandle: string
  targetHandle: string
  sourceSide: CardinalAnchorSide
  targetSide: CardinalAnchorSide
  sourceContactOffset?: ContactOffset
  targetContactOffset?: ContactOffset
}

export interface AnchorDistributionResult {
  nodeHandles: Map<string, DistributedHandleDescriptor[]>
  nodeScale: Map<string, NodeScaleState>
  edgeAssignments: Map<string, EdgeAnchorAssignment>
}

interface ConnectedEdgeRef {
  edgeKey: string
  isSource: boolean
  oppositeNodeId: string
}

function getNodeBounds(node: Node | undefined, isScaled: boolean = false): NodeBounds {
  if (!node) {
    return { x: 0, y: 0, width: 160, height: 60 }
  }
  const isCircle = node.type === 'circle'
  const defaultW = isCircle ? (isScaled ? 260 : 130) : 160
  const defaultH = isCircle ? (isScaled ? 260 : 130) : 60
  const width = Math.max(node.measured?.width ?? defaultW, defaultW)
  const height = Math.max(node.measured?.height ?? defaultH, defaultH)
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  }
}

/**
 * Calcule la distribution multi-ports (positions réparties à 1/(N+1)...)
 * et le redimensionnement automatique des formes (x2 si > 8 connecteurs par flanc).
 */
export function computeAnchorDistribution(
  ast: NankoAst,
  nodes: Node[],
): AnchorDistributionResult {
  const nodeMap = new Map<string, Node>()
  for (const n of nodes) {
    nodeMap.set(n.id, n)
  }

  const edgeLayout = (ast?.edgeLayout ?? {}) as Record<
    string,
    { from?: string; to?: string }
  >

  // Résoudre les flancs source et target pour chaque connecteur
  const preliminarySides = new Map<
    string,
    { sourceSide: CardinalAnchorSide; targetSide: CardinalAnchorSide }
  >()

  for (const connector of ast?.connectors ?? []) {
    const edgeKey = `${connector.source}->${connector.target}`
    const layoutEntry = edgeLayout[edgeKey]
    const sNode = nodeMap.get(connector.source)
    const tNode = nodeMap.get(connector.target)

    let sourceSide: CardinalAnchorSide =
      layoutEntry?.from && isCardinalSide(layoutEntry.from) ? layoutEntry.from : 'right'
    let targetSide: CardinalAnchorSide =
      layoutEntry?.to && isCardinalSide(layoutEntry.to) ? layoutEntry.to : 'left'

    if (
      sNode &&
      tNode &&
      (!isCardinalSide(layoutEntry?.from) || !isCardinalSide(layoutEntry?.to))
    ) {
      const sBounds = getNodeBounds(sNode)
      const tBounds = getNodeBounds(tNode)
      const optimal = getOptimalConnectorSides(
        sBounds,
        tBounds,
        layoutEntry?.from as CardinalAnchorSide | 'auto' | undefined,
        layoutEntry?.to as CardinalAnchorSide | 'auto' | undefined,
      )
      sourceSide = optimal.sourceSide
      targetSide = optimal.targetSide
    }

    preliminarySides.set(edgeKey, { sourceSide, targetSide })
  }

  // Grouper les arêtes par nœud et par flanc
  const nodeFlanks = new Map<string, Record<CardinalAnchorSide, ConnectedEdgeRef[]>>()

  for (const shape of ast?.shapes ?? []) {
    nodeFlanks.set(shape.id, {
      left: [],
      right: [],
      top: [],
      bottom: [],
    })
  }

  for (const connector of ast?.connectors ?? []) {
    const edgeKey = `${connector.source}->${connector.target}`
    const sides = preliminarySides.get(edgeKey)
    if (!sides) continue

    const sEntry = nodeFlanks.get(connector.source)
    if (sEntry) {
      sEntry[sides.sourceSide].push({
        edgeKey,
        isSource: true,
        oppositeNodeId: connector.target,
      })
    }

    const tEntry = nodeFlanks.get(connector.target)
    if (tEntry) {
      tEntry[sides.targetSide].push({
        edgeKey,
        isSource: false,
        oppositeNodeId: connector.source,
      })
    }
  }

  const nodeScale = new Map<string, NodeScaleState>()
  const nodeHandles = new Map<string, DistributedHandleDescriptor[]>()
  const edgeAssignments = new Map<string, EdgeAnchorAssignment>()

  // Initialiser les assignations d'arêtes avec les flancs résolus
  for (const [edgeKey, sides] of preliminarySides.entries()) {
    edgeAssignments.set(edgeKey, {
      sourceHandle: sides.sourceSide,
      targetHandle: sides.targetSide,
      sourceSide: sides.sourceSide,
      targetSide: sides.targetSide,
    })
  }

  const CARDINALS: CardinalAnchorSide[] = ['left', 'right', 'top', 'bottom']

  for (const [nodeId, flanks] of nodeFlanks.entries()) {
    const node = nodeMap.get(nodeId)
    const isCircle = node?.type === 'circle'

    const leftCount = flanks.left.length
    const rightCount = flanks.right.length
    const topCount = flanks.top.length
    const bottomCount = flanks.bottom.length

    const isVerticalScaled = leftCount > CAPACITY_THRESHOLD || rightCount > CAPACITY_THRESHOLD
    const isHorizontalScaled = topCount > CAPACITY_THRESHOLD || bottomCount > CAPACITY_THRESHOLD
    const isCircleScaled = isVerticalScaled || isHorizontalScaled

    nodeScale.set(nodeId, {
      isVerticalScaled: isCircle ? isCircleScaled : isVerticalScaled,
      isHorizontalScaled: isCircle ? isCircleScaled : isHorizontalScaled,
      isCircleScaled,
    })

    const handlesList: DistributedHandleDescriptor[] = []

    for (const side of CARDINALS) {
      const edges = flanks[side]
      const count = edges.length
      if (count <= 1) continue

      // Trier les arêtes le long de la face pour minimiser les croisements
      edges.sort((a, b) => {
        const oppNodeA = nodeMap.get(a.oppositeNodeId)
        const oppNodeB = nodeMap.get(b.oppositeNodeId)
        const boundsA = getNodeBounds(oppNodeA)
        const boundsB = getNodeBounds(oppNodeB)

        if (side === 'left' || side === 'right') {
          // Flancs verticaux : trier selon le centre Y de la forme opposée
          const centerYA = boundsA.y + boundsA.height / 2
          const centerYB = boundsB.y + boundsB.height / 2
          if (centerYA !== centerYB) {
            return centerYA - centerYB
          }
        } else {
          // Flancs horizontaux : trier selon le centre X de la forme opposée
          const centerXA = boundsA.x + boundsA.width / 2
          const centerXB = boundsB.x + boundsB.width / 2
          if (centerXA !== centerXB) {
            return centerXA - centerXB
          }
        }
        return a.edgeKey.localeCompare(b.edgeKey)
      })

      // Répartir uniformément à 1/(N+1), 2/(N+1)...
      for (let i = 0; i < count; i++) {
        const edgeRef = edges[i]
        const ratio = (i + 1) / (count + 1)
        const offsetPercentage = Math.round(ratio * 10000) / 100 // e.g. 25, 33.33, 50, 75
        const handleId = `${side}-${edgeRef.edgeKey}`

        let circleLeftPercentage: number | undefined
        let circleTopPercentage: number | undefined

        if (isCircle) {
          const contact = getPerimeterContact(side, offsetPercentage, 'circle')
          circleLeftPercentage = Math.round(contact.xPercentage * 100) / 100
          circleTopPercentage = Math.round(contact.yPercentage * 100) / 100
        }

        handlesList.push({
          id: handleId,
          side,
          offsetPercentage,
          circleLeftPercentage,
          circleTopPercentage,
        })

        // Mettre à jour l'assignation du handle sur l'arête
        const assignment = edgeAssignments.get(edgeRef.edgeKey)
        if (assignment) {
          if (edgeRef.isSource) {
            assignment.sourceHandle = handleId
            if (isCircle) {
              const contact = getPerimeterContact(side, offsetPercentage, 'circle')
              const bounds = getNodeBounds(node, isCircleScaled)
              assignment.sourceContactOffset = {
                dx: Math.round((contact.deltaXPercentage / 100) * bounds.width * 100) / 100,
                dy: Math.round((contact.deltaYPercentage / 100) * bounds.height * 100) / 100,
              }
            }
          } else {
            assignment.targetHandle = handleId
            if (isCircle) {
              const contact = getPerimeterContact(side, offsetPercentage, 'circle')
              const bounds = getNodeBounds(node, isCircleScaled)
              assignment.targetContactOffset = {
                dx: Math.round((contact.deltaXPercentage / 100) * bounds.width * 100) / 100,
                dy: Math.round((contact.deltaYPercentage / 100) * bounds.height * 100) / 100,
              }
            }
          }
        }
      }
    }

    nodeHandles.set(nodeId, handlesList)
  }

  return {
    nodeHandles,
    nodeScale,
    edgeAssignments,
  }
}

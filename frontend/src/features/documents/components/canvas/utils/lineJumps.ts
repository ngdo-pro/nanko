import { Position, getSmoothStepPath, type Node } from '@xyflow/react'
import type { CardinalAnchorSide } from './connectorGeometry'
import type { AnchorDistributionResult } from './anchorDistribution'
import type { NankoAst } from '@/features/documents'

export interface Point {
  x: number
  y: number
}

export interface OrthogonalSegment {
  start: Point
  end: Point
  orientation: 'horizontal' | 'vertical'
}

export interface LineJumpDescriptor {
  x: number
  y: number
  segmentIndex: number
  orientation: 'horizontal' | 'vertical'
  direction: 'positive' | 'negative'
}

export interface EdgePathInfo {
  id: string
  path: string
  zIndex: number
}

export const DEFAULT_LINE_JUMP_RADIUS = 6
export const MIN_CORNER_CLEARANCE = 14

/**
 * Calcule la distance minimale d'une intersection aux deux extrémités (coins ou bornes) d'un segment.
 */
export function getSegmentClearance(seg: OrthogonalSegment, intersection: Point): number {
  if (seg.orientation === 'horizontal') {
    const distToStart = Math.abs(intersection.x - seg.start.x)
    const distToEnd = Math.abs(intersection.x - seg.end.x)
    return Math.min(distToStart, distToEnd)
  } else {
    const distToStart = Math.abs(intersection.y - seg.start.y)
    const distToEnd = Math.abs(intersection.y - seg.end.y)
    return Math.min(distToStart, distToEnd)
  }
}

/**
 * Extrait les coordonnées des points composant un chemin SVG orthogonal (M ... L ...).
 */
export function extractPathPoints(svgPath: string): Point[] {
  const points: Point[] = []
  const regex = /([ML])\s*([-\d.]+)[,\s]+([-\d.]+)/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(svgPath)) !== null) {
    points.push({
      x: parseFloat(match[2]),
      y: parseFloat(match[3]),
    })
  }

  return points
}

/**
 * Simplifie une séquence de points en fusionnant les points intermédiaires colinéaires et les doublons.
 */
export function simplifyCollinearPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points
  const result: Point[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]

    // Éliminer les points consécutifs identiques
    if (Math.abs(prev.x - curr.x) < 0.001 && Math.abs(prev.y - curr.y) < 0.001) {
      continue
    }

    if (i < points.length - 1) {
      const next = points[i + 1]
      const isCollinearH = Math.abs(prev.y - curr.y) < 0.001 && Math.abs(curr.y - next.y) < 0.001
      const isCollinearV = Math.abs(prev.x - curr.x) < 0.001 && Math.abs(curr.x - next.x) < 0.001

      if (isCollinearH || isCollinearV) {
        continue
      }
    }

    result.push(curr)
  }

  return result
}

/**
 * Décompose une séquence de points en segments orthogonaux.
 */
export function extractOrthogonalSegments(points: Point[]): OrthogonalSegment[] {
  const simplified = simplifyCollinearPoints(points)
  const segments: OrthogonalSegment[] = []

  for (let i = 0; i < simplified.length - 1; i++) {
    const start = simplified[i]
    const end = simplified[i + 1]

    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)

    // Segment horizontal si dx > dy
    if (dx >= dy && dx > 0.001) {
      segments.push({
        start,
        end,
        orientation: 'horizontal',
      })
    } else if (dy > 0.001) {
      segments.push({
        start,
        end,
        orientation: 'vertical',
      })
    }
  }

  return segments
}

/**
 * Calcule le point d'intersection strict entre un segment horizontal et un segment vertical.
 * Retourne null si les segments ne se croisent pas ou se touchent trop près des extrémités.
 */
export function findOrthogonalIntersection(
  segA: OrthogonalSegment,
  segB: OrthogonalSegment,
  margin = 8,
): Point | null {
  if (segA.orientation === segB.orientation) {
    return null
  }

  const hSeg = segA.orientation === 'horizontal' ? segA : segB
  const vSeg = segA.orientation === 'vertical' ? segA : segB

  const minHx = Math.min(hSeg.start.x, hSeg.end.x)
  const maxHx = Math.max(hSeg.start.x, hSeg.end.x)
  const hY = hSeg.start.y

  const minVy = Math.min(vSeg.start.y, vSeg.end.y)
  const maxVy = Math.max(vSeg.start.y, vSeg.end.y)
  const vX = vSeg.start.x

  // Vérifier si vX est strictement entre minHx et maxHx avec marge
  const hCoversV = vX >= minHx + margin && vX <= maxHx - margin
  // Vérifier si hY est strictement entre minVy et maxVy avec marge
  const vCoversH = hY >= minVy + margin && hY <= maxVy - margin

  if (hCoversV && vCoversH) {
    return { x: vX, y: hY }
  }

  return null
}

/**
 * Calcule pour l'ensemble des arêtes les pontets de croisement nécessaires.
 * L'arête avec le z-index effectif le plus élevé reçoit les descripteurs de saut.
 */
export function computeEdgeCrossovers(
  edges: EdgePathInfo[],
  activeEdgeId?: string | null,
  radius: number = DEFAULT_LINE_JUMP_RADIUS,
): Map<string, LineJumpDescriptor[]> {
  const minClearance = Math.max(MIN_CORNER_CLEARANCE, radius * 2 + 2)
  const jumpsMap = new Map<string, LineJumpDescriptor[]>()
  for (const edge of edges) {
    jumpsMap.set(edge.id, [])
  }

  // Extraire les segments pour chaque arête en simplifiant les points colinéaires
  const edgeSegments = new Map<string, OrthogonalSegment[]>()
  for (const edge of edges) {
    const points = simplifyCollinearPoints(extractPathPoints(edge.path))
    edgeSegments.set(edge.id, extractOrthogonalSegments(points))
  }

  // Comparer toutes les paires d'arêtes distinctes
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const edgeA = edges[i]
      const edgeB = edges[j]

      const segsA = edgeSegments.get(edgeA.id) ?? []
      const segsB = edgeSegments.get(edgeB.id) ?? []

      for (let sAi = 0; sAi < segsA.length; sAi++) {
        for (let sBi = 0; sBi < segsB.length; sBi++) {
          const segA = segsA[sAi]
          const segB = segsB[sBi]

          const intersection = findOrthogonalIntersection(segA, segB, 4)
          if (!intersection) continue

          const clearanceA = getSegmentClearance(segA, intersection)
          const clearanceB = getSegmentClearance(segB, intersection)

          // Règle de dégagement stricte : les DEUX arêtes doivent disposer d'un dégagement minimal
          // par rapport à leurs virages/extrémités. Si l'un des deux connecteurs tourne dans la zone
          // du pontet (< minClearance), aucun saut n'est généré (croisement orthogonal propre sans déformation).
          if (clearanceA < minClearance || clearanceB < minClearance) continue

          // Arbitrage selon le z-index effectif
          const zA = edgeA.id === activeEdgeId ? 1000 : edgeA.zIndex
          const zB = edgeB.id === activeEdgeId ? 1000 : edgeB.zIndex

          let winnerEdgeId: string
          let winnerSeg: OrthogonalSegment
          let winnerSegIndex: number

          if (zA > zB) {
            winnerEdgeId = edgeA.id
            winnerSeg = segA
            winnerSegIndex = sAi
          } else if (zB > zA) {
            winnerEdgeId = edgeB.id
            winnerSeg = segB
            winnerSegIndex = sBi
          } else {
            // Départage déterministe : la deuxième arête gagne
            winnerEdgeId = edgeB.id
            winnerSeg = segB
            winnerSegIndex = sBi
          }

          const isHorizontal = winnerSeg.orientation === 'horizontal'
          const direction = isHorizontal
            ? winnerSeg.end.x >= winnerSeg.start.x ? 'positive' : 'negative'
            : winnerSeg.end.y >= winnerSeg.start.y ? 'positive' : 'negative'

          const jumps = jumpsMap.get(winnerEdgeId) ?? []
          jumps.push({
            x: intersection.x,
            y: intersection.y,
            segmentIndex: winnerSegIndex,
            orientation: winnerSeg.orientation,
            direction,
          })
          jumpsMap.set(winnerEdgeId, jumps)
        }
      }
    }
  }

  return jumpsMap
}

/**
 * Réécrit un chemin SVG orthogonal en insérant des arcs de pontet (A r r 0 0 ...)
 * aux positions des LineJumpDescriptors.
 */
export function applyLineJumpsToPath(
  svgPath: string,
  jumps: LineJumpDescriptor[] | undefined,
  radius: number = DEFAULT_LINE_JUMP_RADIUS,
): string {
  if (!jumps || jumps.length === 0) {
    return svgPath
  }

  const points = simplifyCollinearPoints(extractPathPoints(svgPath))
  if (points.length < 2) {
    return svgPath
  }

  // Grouper les jumps par segment via correspondance spatiale stricte (avec repli sur segmentIndex)
  const jumpsBySegment = new Map<number, LineJumpDescriptor[]>()
  for (const jump of jumps) {
    let matchedSegIndex = -1
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const isH = Math.abs(p1.y - p2.y) < 0.001

      if (isH && jump.orientation === 'horizontal') {
        const minX = Math.min(p1.x, p2.x)
        const maxX = Math.max(p1.x, p2.x)
        if (Math.abs(p1.y - jump.y) < 0.5 && jump.x >= minX - 0.5 && jump.x <= maxX + 0.5) {
          matchedSegIndex = i
          break
        }
      } else if (!isH && jump.orientation === 'vertical') {
        const minY = Math.min(p1.y, p2.y)
        const maxY = Math.max(p1.y, p2.y)
        if (Math.abs(p1.x - jump.x) < 0.5 && jump.y >= minY - 0.5 && jump.y <= maxY + 0.5) {
          matchedSegIndex = i
          break
        }
      }
    }

    const segIdx = matchedSegIndex !== -1 ? matchedSegIndex : jump.segmentIndex
    if (segIdx >= 0 && segIdx < points.length - 1) {
      const list = jumpsBySegment.get(segIdx) ?? []
      list.push(jump)
      jumpsBySegment.set(segIdx, list)
    }
  }

  let resultPath = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    const segJumps = jumpsBySegment.get(i)

    if (!segJumps || segJumps.length === 0) {
      resultPath += ` L ${end.x} ${end.y}`
      continue
    }

    const isHorizontal = Math.abs(end.y - start.y) < Math.abs(end.x - start.x)

    // Trier les jumps le long du segment depuis start vers end
    const sortedJumps = [...segJumps].sort((a, b) => {
      const distA = isHorizontal ? Math.abs(a.x - start.x) : Math.abs(a.y - start.y)
      const distB = isHorizontal ? Math.abs(b.x - start.x) : Math.abs(b.y - start.y)
      return distA - distB
    })

    // Éliminer les jumps trop rapprochés (moins de 2 * radius d'intervalle)
    const validJumps: LineJumpDescriptor[] = []
    let lastCoord = isHorizontal ? start.x : start.y

    for (const j of sortedJumps) {
      const coord = isHorizontal ? j.x : j.y
      if (Math.abs(coord - lastCoord) >= radius * 2) {
        validJumps.push(j)
        lastCoord = coord
      }
    }

    for (const jump of validJumps) {
      const { x: jx, y: jy, direction } = jump

      if (isHorizontal) {
        const minX = Math.min(start.x, end.x)
        const maxX = Math.max(start.x, end.x)
        // Garde-fou strict : le pontet doit être entièrement compris dans le segment avec marge de 2px
        if (jx - radius < minX + 2 || jx + radius > maxX - 2) {
          continue
        }

        if (direction === 'positive') {
          // Gauche vers droite : arc bombé vers le haut (y décroissant)
          const enterX = jx - radius
          const exitX = jx + radius
          resultPath += ` L ${enterX} ${jy} A ${radius} ${radius} 0 0 1 ${exitX} ${jy}`
        } else {
          // Droite vers gauche : arc bombé vers le haut
          const enterX = jx + radius
          const exitX = jx - radius
          resultPath += ` L ${enterX} ${jy} A ${radius} ${radius} 0 0 0 ${exitX} ${jy}`
        }
      } else {
        const minY = Math.min(start.y, end.y)
        const maxY = Math.max(start.y, end.y)
        // Garde-fou strict : le pontet doit être entièrement compris dans le segment avec marge de 2px
        if (jy - radius < minY + 2 || jy + radius > maxY - 2) {
          continue
        }

        if (direction === 'positive') {
          // Haut vers bas : arc bombé vers la droite (x croissant)
          const enterY = jy - radius
          const exitY = jy + radius
          resultPath += ` L ${jx} ${enterY} A ${radius} ${radius} 0 0 1 ${jx} ${exitY}`
        } else {
          // Bas vers haut : arc bombé vers la droite
          const enterY = jy + radius
          const exitY = jy - radius
          resultPath += ` L ${jx} ${enterY} A ${radius} ${radius} 0 0 0 ${jx} ${exitY}`
        }
      }
    }

    resultPath += ` L ${end.x} ${end.y}`
  }

  return resultPath
}

/**
 * Calcule les coordonnées précises du point d'ancrage d'un handle sur un nœud.
 */
export function getNodeAnchorPoint(
  node: Node | undefined,
  side: CardinalAnchorSide,
  offsetPercentage: number = 50,
): { x: number; y: number; position: Position } {
  if (!node) {
    return { x: 0, y: 0, position: Position.Right }
  }

  const scale = node.data?.scale as {
    isVerticalScaled?: boolean
    isHorizontalScaled?: boolean
    isCircleScaled?: boolean
  } | undefined

  const isCircle = node.type === 'circle'
  const defaultW = isCircle ? (scale?.isCircleScaled ? 260 : 130) : (scale?.isHorizontalScaled ? 320 : 160)
  const defaultH = isCircle ? (scale?.isCircleScaled ? 260 : 130) : (scale?.isVerticalScaled ? 120 : 60)

  const width = Math.max(node.measured?.width ?? defaultW, defaultW)
  const height = Math.max(node.measured?.height ?? defaultH, defaultH)

  const bx = node.position.x
  const by = node.position.y

  switch (side) {
    case 'right':
      return {
        x: bx + width,
        y: by + (offsetPercentage / 100) * height,
        position: Position.Right,
      }
    case 'left':
      return {
        x: bx,
        y: by + (offsetPercentage / 100) * height,
        position: Position.Left,
      }
    case 'bottom':
      return {
        x: bx + (offsetPercentage / 100) * width,
        y: by + height,
        position: Position.Bottom,
      }
    case 'top':
      return {
        x: bx + (offsetPercentage / 100) * width,
        y: by,
        position: Position.Top,
      }
  }
}

/**
 * Calcule l'ensemble des pontets de croisement pour tous les connecteurs de l'AST.
 */
export function computeAstEdgeCrossovers(
  ast: NankoAst,
  nodes: Node[],
  distribution: AnchorDistributionResult,
  activeEdgeId?: string | null,
): Map<string, LineJumpDescriptor[]> {
  const nodeMap = new Map<string, Node>()
  for (const n of nodes) {
    nodeMap.set(n.id, n)
  }

  const edgeLayout = (ast?.edgeLayout ?? {}) as Record<
    string,
    { from?: string; to?: string; zIndex?: number | string }
  >
  const edgeInfos: EdgePathInfo[] = []

  const connectors = ast?.connectors ?? []
  for (let idx = 0; idx < connectors.length; idx++) {
    const connector = connectors[idx]
    const edgeKey = `${connector.source}->${connector.target}`
    const assignment = distribution.edgeAssignments.get(edgeKey)
    if (!assignment) continue

    const sNode = nodeMap.get(connector.source)
    const tNode = nodeMap.get(connector.target)
    if (!sNode || !tNode) continue

    const sHandles = distribution.nodeHandles.get(connector.source) ?? []
    const tHandles = distribution.nodeHandles.get(connector.target) ?? []

    const sDesc = sHandles.find((h) => h.id === assignment.sourceHandle)
    const tDesc = tHandles.find((h) => h.id === assignment.targetHandle)

    const sPoint = getNodeAnchorPoint(sNode, assignment.sourceSide, sDesc?.offsetPercentage ?? 50)
    const tPoint = getNodeAnchorPoint(tNode, assignment.targetSide, tDesc?.offsetPercentage ?? 50)

    const [rawPath] = getSmoothStepPath({
      sourceX: sPoint.x,
      sourceY: sPoint.y,
      sourcePosition: sPoint.position,
      targetX: tPoint.x,
      targetY: tPoint.y,
      targetPosition: tPoint.position,
      borderRadius: 0,
    })

    const layoutZ = edgeLayout[edgeKey]?.zIndex
    const explicitZ = typeof layoutZ === 'number' ? layoutZ : (typeof layoutZ === 'string' ? parseInt(layoutZ, 10) : undefined)
    const zIndex = explicitZ ?? (idx + 1)

    edgeInfos.push({
      id: edgeKey,
      path: rawPath,
      zIndex,
    })
  }

  return computeEdgeCrossovers(edgeInfos, activeEdgeId)
}

import {
  extractPathPoints,
  extractOrthogonalSegments,
  type Point,
  type OrthogonalSegment,
} from './lineJumps'

export interface ProjectedLabelPosition {
  x: number
  y: number
  distance: number
  orientation: 'horizontal' | 'vertical'
}

/**
 * Projette orthogonalement un point 2D sur un ensemble de segments orthogonaux.
 * Le point résultant est garanti de se situer exactement sur l'un des segments,
 * avec une marge de sécurité optionnelle par rapport aux extrémités du tracé.
 */
export function projectPointOnOrthogonalSegments(
  point: Point,
  segments: OrthogonalSegment[],
  padding = 8,
): ProjectedLabelPosition {
  if (segments.length === 0) {
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
      distance: 0,
      orientation: 'horizontal',
    }
  }

  let bestResult: ProjectedLabelPosition = {
    x: Math.round(point.x),
    y: Math.round(point.y),
    distance: Infinity,
    orientation: 'horizontal',
  }
  let minDistanceSq = Infinity

  for (let idx = 0; idx < segments.length; idx++) {
    const seg = segments[idx]
    let projX: number
    let projY: number

    // Marger les extrémités du premier et dernier segment pour éviter de masquer les nœuds/handles
    const isFirstSeg = idx === 0
    const isLastSeg = idx === segments.length - 1

    if (seg.orientation === 'horizontal') {
      projY = seg.start.y
      const minX = Math.min(seg.start.x, seg.end.x)
      const maxX = Math.max(seg.start.x, seg.end.x)
      const segLen = maxX - minX

      let startPad = 0
      let endPad = 0

      if (isFirstSeg) {
        startPad = seg.start.x < seg.end.x ? padding : 0
        endPad = seg.start.x > seg.end.x ? padding : 0
      }
      if (isLastSeg) {
        startPad = seg.start.x > seg.end.x ? padding : startPad
        endPad = seg.start.x < seg.end.x ? padding : endPad
      }

      if (segLen > startPad + endPad) {
        projX = Math.max(minX + startPad, Math.min(maxX - endPad, point.x))
      } else {
        projX = minX + segLen / 2
      }
    } else {
      projX = seg.start.x
      const minY = Math.min(seg.start.y, seg.end.y)
      const maxY = Math.max(seg.start.y, seg.end.y)
      const segLen = maxY - minY

      let startPad = 0
      let endPad = 0

      if (isFirstSeg) {
        startPad = seg.start.y < seg.end.y ? padding : 0
        endPad = seg.start.y > seg.end.y ? padding : 0
      }
      if (isLastSeg) {
        startPad = seg.start.y > seg.end.y ? padding : startPad
        endPad = seg.start.y < seg.end.y ? padding : endPad
      }

      if (segLen > startPad + endPad) {
        projY = Math.max(minY + startPad, Math.min(maxY - endPad, point.y))
      } else {
        projY = minY + segLen / 2
      }
    }

    const dx = point.x - projX
    const dy = point.y - projY
    const distSq = dx * dx + dy * dy

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq
      bestResult = {
        x: Math.round(projX),
        y: Math.round(projY),
        distance: Math.sqrt(distSq),
        orientation: seg.orientation,
      }
    }
  }

  return bestResult
}

/**
 * Projette un point sur le tracé orthogonal SVG d'un connecteur.
 * Retourne les coordonnées (x, y) strictement positionnées sur le trait du connecteur.
 */
export function projectPointOnEdgePath(
  point: Point,
  svgPath: string,
  padding = 8,
): Point {
  const points = extractPathPoints(svgPath)
  const segments = extractOrthogonalSegments(points)
  const projection = projectPointOnOrthogonalSegments(point, segments, padding)
  return { x: projection.x, y: projection.y }
}

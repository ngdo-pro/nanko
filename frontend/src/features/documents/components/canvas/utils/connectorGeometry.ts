export type CardinalAnchorSide = 'top' | 'bottom' | 'left' | 'right'
export type AnchorSide = CardinalAnchorSide | 'auto'

export interface NodeBounds {
  x: number
  y: number
  width: number
  height: number
}

const CARDINAL_SIDES: CardinalAnchorSide[] = ['top', 'bottom', 'left', 'right']

export function isCardinalSide(side: unknown): side is CardinalAnchorSide {
  return typeof side === 'string' && CARDINAL_SIDES.includes(side as CardinalAnchorSide)
}

/**
 * Calcule les faces de contact optimales (top, bottom, left, right)
 * entre deux nœuds, particulièrement lorsqu'au moins une extrémité est en mode 'auto'.
 */
export function getOptimalConnectorSides(
  sourceBounds: NodeBounds,
  targetBounds: NodeBounds,
  sourceAnchor?: AnchorSide | null,
  targetAnchor?: AnchorSide | null,
): { sourceSide: CardinalAnchorSide; targetSide: CardinalAnchorSide } {
  const isSourceFixed = isCardinalSide(sourceAnchor)
  const isTargetFixed = isCardinalSide(targetAnchor)

  if (isSourceFixed && isTargetFixed) {
    return {
      sourceSide: sourceAnchor,
      targetSide: targetAnchor,
    }
  }

  const sCenterX = sourceBounds.x + sourceBounds.width / 2
  const sCenterY = sourceBounds.y + sourceBounds.height / 2
  const tCenterX = targetBounds.x + targetBounds.width / 2
  const tCenterY = targetBounds.y + targetBounds.height / 2

  if (!isSourceFixed && !isTargetFixed) {
    const dx = tCenterX - sCenterX
    const dy = tCenterY - sCenterY

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0
        ? { sourceSide: 'right', targetSide: 'left' }
        : { sourceSide: 'left', targetSide: 'right' }
    } else {
      return dy >= 0
        ? { sourceSide: 'bottom', targetSide: 'top' }
        : { sourceSide: 'top', targetSide: 'bottom' }
    }
  }

  if (isSourceFixed && !isTargetFixed) {
    let anchorPointX = sCenterX
    let anchorPointY = sCenterY

    if (sourceAnchor === 'left') anchorPointX = sourceBounds.x
    else if (sourceAnchor === 'right') anchorPointX = sourceBounds.x + sourceBounds.width
    else if (sourceAnchor === 'top') anchorPointY = sourceBounds.y
    else if (sourceAnchor === 'bottom') anchorPointY = sourceBounds.y + sourceBounds.height

    const dx = anchorPointX - tCenterX
    const dy = anchorPointY - tCenterY

    let targetSide: CardinalAnchorSide
    if (Math.abs(dx) >= Math.abs(dy)) {
      targetSide = dx >= 0 ? 'right' : 'left'
    } else {
      targetSide = dy >= 0 ? 'bottom' : 'top'
    }

    return {
      sourceSide: sourceAnchor,
      targetSide,
    }
  }

  // !isSourceFixed && isTargetFixed
  const fixedTarget = targetAnchor as CardinalAnchorSide
  let anchorPointX = tCenterX
  let anchorPointY = tCenterY

  if (fixedTarget === 'left') anchorPointX = targetBounds.x
  else if (fixedTarget === 'right') anchorPointX = targetBounds.x + targetBounds.width
  else if (fixedTarget === 'top') anchorPointY = targetBounds.y
  else if (fixedTarget === 'bottom') anchorPointY = targetBounds.y + targetBounds.height

  const dx = anchorPointX - sCenterX
  const dy = anchorPointY - sCenterY

  let sourceSide: CardinalAnchorSide
  if (Math.abs(dx) >= Math.abs(dy)) {
    sourceSide = dx >= 0 ? 'right' : 'left'
  } else {
    sourceSide = dy >= 0 ? 'bottom' : 'top'
  }

  return {
    sourceSide,
    targetSide: fixedTarget,
  }
}

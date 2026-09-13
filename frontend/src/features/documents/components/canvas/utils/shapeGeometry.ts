import type { AnchorSide } from './connectorGeometry'

export interface PerimeterContactPoint {
  xPercentage: number // 0-100% relatif à la boîte englobante
  yPercentage: number // 0-100% relatif à la boîte englobante
}

/**
 * Calcule les coordonnées d'arrêt exactes d'un connecteur sur le périmètre réel
 * de la forme affichée à partir du slot d'entrée sur la boîte de manipulation (INV-7).
 *
 * @param side Le flanc d'arrivée sur la boîte de manipulation ('left' | 'right' | 'top' | 'bottom')
 * @param offsetPercentage Le ratio de positionnement (0 - 100%) le long du flanc
 * @param shapeType Le type de la forme ('rectangle' | 'circle' | 'text' | string)
 */
export function getPerimeterContact(
  side: AnchorSide,
  offsetPercentage: number,
  shapeType: string = 'rectangle',
): PerimeterContactPoint {
  // 1. Pour les formes rectangulaires et textuelles :
  // La boîte de manipulation et la forme affichée se confondent exactement.
  if (shapeType !== 'circle') {
    switch (side) {
      case 'left':
        return { xPercentage: 0, yPercentage: offsetPercentage }
      case 'right':
        return { xPercentage: 100, yPercentage: offsetPercentage }
      case 'top':
        return { xPercentage: offsetPercentage, yPercentage: 0 }
      case 'bottom':
        return { xPercentage: offsetPercentage, yPercentage: 100 }
    }
  }

  // 2. Pour les formes circulaires :
  // Le cercle est inscrit dans la boîte de manipulation (centre à (50%, 50%), rayon R = 50%).
  // Équation du cercle normalisée : (x - 50)^2 + (y - 50)^2 = 50^2 = 2500
  if (side === 'left' || side === 'right') {
    const yDelta = offsetPercentage - 50
    // xOffset = sqrt(R^2 - yDelta^2)
    const xOffset = Math.sqrt(Math.max(0, 2500 - yDelta * yDelta))
    const xPercentage = side === 'left' ? 50 - xOffset : 50 + xOffset
    return {
      xPercentage,
      yPercentage: offsetPercentage,
    }
  } else {
    // side === 'top' || side === 'bottom'
    const xDelta = offsetPercentage - 50
    // yOffset = sqrt(R^2 - xDelta^2)
    const yOffset = Math.sqrt(Math.max(0, 2500 - xDelta * xDelta))
    const yPercentage = side === 'top' ? 50 - yOffset : 50 + yOffset
    return {
      xPercentage: offsetPercentage,
      yPercentage,
    }
  }
}

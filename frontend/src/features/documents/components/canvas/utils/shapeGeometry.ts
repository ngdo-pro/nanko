import type { AnchorSide } from './connectorGeometry'

export interface PerimeterContactResult {
  // Point sur la boîte de manipulation (0-100%)
  boxXPercentage: number
  boxYPercentage: number
  // Point de contact sur le contour réel de la forme affichée (0-100%)
  perimeterXPercentage: number
  perimeterYPercentage: number
  // Décalage vectoriel (perimeter - box) en %
  deltaXPercentage: number
  deltaYPercentage: number
  // Alias de compatibilité
  xPercentage: number
  yPercentage: number
}

/**
 * Calcule les coordonnées d'arrêt exactes d'un connecteur sur le périmètre réel
 * de la forme affichée à partir du slot d'entrée sur la boîte de manipulation (INV-7).
 *
 * Pour un cercle, le connecteur arrive sur l'arrête de la boîte de manipulation (P_box),
 * puis s'oriente en ligne droite vers le centre C (50%, 50%) de la forme affichée,
 * et s'arrête pile sur le périmètre circulaire de rayon R = 50%.
 *
 * @param side Le flanc d'arrivée sur la boîte de manipulation ('left' | 'right' | 'top' | 'bottom')
 * @param offsetPercentage Le ratio de positionnement (0 - 100%) le long du flanc
 * @param shapeType Le type de la forme ('rectangle' | 'circle' | 'text' | string)
 */
export function getPerimeterContact(
  side: AnchorSide,
  offsetPercentage: number,
  shapeType: string = 'rectangle',
): PerimeterContactResult {
  let boxX = 0
  let boxY = 0

  switch (side) {
    case 'left':
      boxX = 0
      boxY = offsetPercentage
      break
    case 'right':
      boxX = 100
      boxY = offsetPercentage
      break
    case 'top':
      boxX = offsetPercentage
      boxY = 0
      break
    case 'bottom':
      boxX = offsetPercentage
      boxY = 100
      break
  }

  // 1. Pour les formes rectangulaires et textuelles :
  // La boîte de manipulation et la forme affichée se confondent exactement (contact direct).
  if (shapeType !== 'circle') {
    return {
      boxXPercentage: boxX,
      boxYPercentage: boxY,
      perimeterXPercentage: boxX,
      perimeterYPercentage: boxY,
      deltaXPercentage: 0,
      deltaYPercentage: 0,
      xPercentage: boxX,
      yPercentage: boxY,
    }
  }

  // 2. Pour les formes circulaires :
  // Le cercle de rayon R = 50% est centré à C = (50%, 50%).
  // Le vecteur v relie le centre C au point d'entrée P_box sur le rectangle : v = P_box - C.
  // Le point de contact sur le périmètre est P_contact = C + (R / ||v||) * v.
  const vx = boxX - 50
  const vy = boxY - 50
  const L = Math.hypot(vx, vy)

  if (L === 0) {
    return {
      boxXPercentage: boxX,
      boxYPercentage: boxY,
      perimeterXPercentage: 50,
      perimeterYPercentage: 50,
      deltaXPercentage: 0,
      deltaYPercentage: 0,
      xPercentage: 50,
      yPercentage: 50,
    }
  }

  const perimeterX = 50 + (50 / L) * vx
  const perimeterY = 50 + (50 / L) * vy

  const roundedPerimeterX = Math.round(perimeterX * 1000000) / 1000000
  const roundedPerimeterY = Math.round(perimeterY * 1000000) / 1000000

  return {
    boxXPercentage: boxX,
    boxYPercentage: boxY,
    perimeterXPercentage: roundedPerimeterX,
    perimeterYPercentage: roundedPerimeterY,
    deltaXPercentage: Math.round((roundedPerimeterX - boxX) * 1000000) / 1000000,
    deltaYPercentage: Math.round((roundedPerimeterY - boxY) * 1000000) / 1000000,
    xPercentage: roundedPerimeterX,
    yPercentage: roundedPerimeterY,
  }
}

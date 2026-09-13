import {
  insertShapeToSource,
  type ShapePrimitiveType,
} from './insertShapeToSource'
import {
  insertConnectorToSource,
  type InsertConnectorOptions,
} from './insertConnectorToSource'
import type { AnchorSide } from './connectorGeometry'

export interface QuickSpawnOptions {
  sourceCode: string
  sourceNodeId: string
  sourceHandle?: AnchorSide | null
  shapeType: ShapePrimitiveType
  cursorPosition: { x: number; y: number }
}

export interface QuickSpawnResult {
  newSourceCode: string
  newShapeId: string
}

/**
 * Détermine l'ancre d'arrivée canonique opposée à la poignée source,
 * ou conserve 'auto' si le départ était 'auto'.
 */
export function getOppositeAnchorSide(sourceSide?: AnchorSide | null): AnchorSide {
  switch (sourceSide) {
    case 'right':
      return 'left'
    case 'left':
      return 'right'
    case 'bottom':
      return 'top'
    case 'top':
      return 'bottom'
    case 'auto':
    default:
      return 'auto'
  }
}

/**
 * Calcule la coordonnée du coin supérieur gauche de la nouvelle forme
 * pour que son centre coïncide exactement avec la position du curseur.
 */
export function calculateCenteredShapePosition(
  shapeType: ShapePrimitiveType,
  cursorPos: { x: number; y: number },
): { x: number; y: number } {
  switch (shapeType) {
    case 'rectangle':
      return {
        x: Math.round(cursorPos.x - 70), // largeur nominale 140 / 2
        y: Math.round(cursorPos.y - 34), // hauteur nominale 68 / 2
      }
    case 'circle':
      return {
        x: Math.round(cursorPos.x - 65), // diamètre nominal 130 / 2
        y: Math.round(cursorPos.y - 65),
      }
    case 'text':
      return {
        x: Math.round(cursorPos.x - 60), // largeur nominale 120 / 2
        y: Math.round(cursorPos.y - 20), // hauteur nominale 40 / 2
      }
  }
}

/**
 * Effectue la création rapide d'une nouvelle forme reliée à un nœud source en une seule mutation atomique :
 * 1. Instanciation de la nouvelle Shape déclarée et positionnée dans !LAYOUT
 * 2. Injection du connecteur reliant le nœud source vers la nouvelle forme
 */
export function quickSpawnConnectedShape({
  sourceCode,
  sourceNodeId,
  sourceHandle,
  shapeType,
  cursorPosition,
}: QuickSpawnOptions): QuickSpawnResult {
  // 1. Calcul de la position centrée de la forme
  const centeredPosition = calculateCenteredShapePosition(shapeType, cursorPosition)

  // 2. Insertion de la nouvelle forme dans le code source
  const shapeResult = insertShapeToSource(sourceCode, {
    type: shapeType,
    position: centeredPosition,
  })

  // 3. Détermination des ancres de connexion
  const targetSide = getOppositeAnchorSide(sourceHandle)
  const connectorOptions: InsertConnectorOptions = {}

  if (sourceHandle && sourceHandle !== 'auto') {
    connectorOptions.from = sourceHandle
  }
  if (targetSide && targetSide !== 'auto') {
    connectorOptions.to = targetSide
  }

  // 4. Insertion du connecteur vers la nouvelle forme
  const connectorResult = insertConnectorToSource(
    shapeResult.newSourceCode,
    sourceNodeId,
    shapeResult.newShapeId,
    connectorOptions,
  )

  return {
    newSourceCode: connectorResult.newSourceCode,
    newShapeId: shapeResult.newShapeId,
  }
}

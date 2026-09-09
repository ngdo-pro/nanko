import { updateNankoSourceLayout } from './syncLayoutToSource'

export type ShapePrimitiveType = 'rectangle' | 'circle' | 'text'

export interface InsertShapeOptions {
  type: ShapePrimitiveType
  position: { x: number; y: number }
  label?: string
}

export interface InsertShapeResult {
  newSourceCode: string
  newShapeId: string
}

const TYPE_PREFIXES: Record<ShapePrimitiveType, string> = {
  rectangle: 'rect',
  circle: 'circle',
  text: 'text',
}

const TYPE_DEFAULT_LABELS: Record<ShapePrimitiveType, string> = {
  rectangle: 'Rectangle',
  circle: 'Circle',
  text: 'Text',
}

/**
 * Extrait tous les identifiants de shapes déjà déclarés dans le code source .nanko
 */
export function extractExistingShapeIds(sourceCode: string): Set<string> {
  const ids = new Set<string>()
  const lines = sourceCode.split(/\r\n|\r|\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '!LAYOUT') {
      // Les shapes sont déclarées avant le bloc layout
      break
    }
    const match = trimmed.match(/^(?:rectangle|circle|text)\s+([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      ids.add(match[1])
    }
  }

  return ids
}

/**
 * Détermine le prochain identifiant unique non utilisé pour un type donné
 */
export function generateUniqueShapeId(type: ShapePrimitiveType, existingIds: Set<string>): string {
  const prefix = TYPE_PREFIXES[type] ?? 'shape'
  let counter = 1

  while (existingIds.has(`${prefix}_${counter}`)) {
    counter++
  }

  return `${prefix}_${counter}`
}

/**
 * Insère la déclaration de shape dans le corps sémantique du code .nanko
 * en garantissant que toutes les shapes restent regroupées ensemble, distinctes des connecteurs.
 */
function insertDeclarationIntoBody(body: string, declaration: string): string {
  const lines = body.split(/\r\n|\r|\n/)

  let lastShapeLineIdx = -1
  let firstConnectorLineIdx = -1
  let lastDirectiveLineIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? ''
    if (/^(?:rectangle|circle|text)\s+[a-zA-Z0-9_-]+/.test(trimmed)) {
      lastShapeLineIdx = i
    }
    if (/^[a-zA-Z0-9_-]+\s*->\s*[a-zA-Z0-9_-]+/.test(trimmed) && firstConnectorLineIdx === -1) {
      firstConnectorLineIdx = i
    }
    if (/^@[a-zA-Z0-9_-]+/.test(trimmed)) {
      lastDirectiveLineIdx = i
    }
  }

  // 1. S'il y a déjà des shapes : insérer immédiatement après la dernière shape
  if (lastShapeLineIdx !== -1) {
    lines.splice(lastShapeLineIdx + 1, 0, declaration)
    return lines.join('\n')
  }

  // 2. S'il n'y a pas de shape mais déjà des connecteurs : insérer avant avec saut de ligne
  if (firstConnectorLineIdx !== -1) {
    lines.splice(firstConnectorLineIdx, 0, declaration, '')
    return lines.join('\n')
  }

  // 3. S'il y a des directives (@id, @layer) : insérer après avec saut de ligne
  if (lastDirectiveLineIdx !== -1) {
    lines.splice(lastDirectiveLineIdx + 1, 0, '', declaration)
    return lines.join('\n')
  }

  // 4. Document vide ou uniquement commentaires
  const trimmed = body.trim()
  return trimmed.length > 0 ? `${trimmed}\n${declaration}` : declaration
}

/**
 * Insère une nouvelle Shape dans le code source .nanko et synchronise sa position dans le bloc !LAYOUT.
 * Les shapes sont toujours regroupées ensemble au-dessus des connecteurs.
 */
export function insertShapeToSource(
  sourceCode: string,
  options: InsertShapeOptions,
): InsertShapeResult {
  const existingIds = extractExistingShapeIds(sourceCode)
  const newShapeId = generateUniqueShapeId(options.type, existingIds)

  const defaultLabel = `${TYPE_DEFAULT_LABELS[options.type]} ${newShapeId.split('_')[1] ?? ''}`.trim()
  const label = options.label ?? defaultLabel
  const declaration = `${options.type} ${newShapeId} "${label}"`

  const layoutIndex = sourceCode.indexOf('!LAYOUT')

  let codeWithDeclaration: string
  if (layoutIndex !== -1) {
    const beforeLayout = sourceCode.slice(0, layoutIndex).trimEnd()
    const afterLayout = sourceCode.slice(layoutIndex)
    const updatedBody = insertDeclarationIntoBody(beforeLayout, declaration)
    codeWithDeclaration = `${updatedBody}\n\n${afterLayout}`
  } else {
    codeWithDeclaration = insertDeclarationIntoBody(sourceCode, declaration)
  }

  const finalSourceCode = updateNankoSourceLayout(codeWithDeclaration, newShapeId, options.position)

  return {
    newSourceCode: finalSourceCode,
    newShapeId,
  }
}

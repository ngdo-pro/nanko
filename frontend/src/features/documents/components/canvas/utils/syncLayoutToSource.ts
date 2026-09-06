/**
 * Met à jour ou insère les coordonnées d'un nœud dans la section !LAYOUT ... !END du code .nanko
 */
export function updateNankoSourceLayout(
  sourceCode: string,
  nodeId: string,
  position: { x: number; y: number },
): string {
  const roundedX = Math.round(position.x)
  const roundedY = Math.round(position.y)
  const layoutEntry = `${nodeId}: x=${roundedX}, y=${roundedY}`

  const layoutRegex = /!LAYOUT([\s\S]*?)!END/
  const match = sourceCode.match(layoutRegex)

  if (!match) {
    // Si la section !LAYOUT n'existe pas, on l'ajoute à la fin
    const trimmed = sourceCode.trimEnd()
    return `${trimmed}\n\n!LAYOUT\n${layoutEntry}\n!END\n`
  }

  const layoutBody = match[1] ?? ''
  const nodeLineRegex = new RegExp(`^\\s*${nodeId}\\s*:\\s*.*$`, 'm')

  let newLayoutBody: string
  if (nodeLineRegex.test(layoutBody)) {
    newLayoutBody = layoutBody.replace(nodeLineRegex, layoutEntry)
  } else {
    const trimmedBody = layoutBody.trim()
    newLayoutBody = trimmedBody.length > 0 ? `${trimmedBody}\n${layoutEntry}` : layoutEntry
  }

  return sourceCode.replace(layoutRegex, `!LAYOUT\n${newLayoutBody.trim()}\n!END`)
}

/**
 * Met à jour ou insère l'ensemble des coordonnées dans la section !LAYOUT ... !END du code .nanko
 */
export function updateNankoSourceBulkLayout(
  sourceCode: string,
  layout: Record<string, { x: number; y: number }>,
): string {
  const entries = Object.entries(layout)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, pos]) => `${id}: x=${Math.round(pos.x)}, y=${Math.round(pos.y)}`)
    .join('\n')

  const layoutRegex = /!LAYOUT([\s\S]*?)!END/
  if (!layoutRegex.test(sourceCode)) {
    const trimmed = sourceCode.trimEnd()
    return `${trimmed}\n\n!LAYOUT\n${entries}\n!END\n`
  }

  return sourceCode.replace(layoutRegex, `!LAYOUT\n${entries}\n!END`)
}

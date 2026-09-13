import { isCardinalSide, type AnchorSide } from './connectorGeometry'

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
 * Met à jour ou insère l'ancrage spatial d'une arête dans la section !LAYOUT ... !END du code .nanko
 * Si ni 'from' ni 'to' n'est une face cardinale (mode 'auto' pur), retire from/to mais préserve labelX/labelY s'ils existent.
 */
export function updateNankoSourceEdgeLayout(
  sourceCode: string,
  source: string,
  target: string,
  options?: { from?: AnchorSide | null; to?: AnchorSide | null },
): string {
  const edgeKey = `${source}->${target}`
  const from = options?.from
  const to = options?.to

  const hasFrom = isCardinalSide(from)
  const hasTo = isCardinalSide(to)

  const layoutRegex = /!LAYOUT([\s\S]*?)!END/
  const match = sourceCode.match(layoutRegex)
  const edgeLineRegex = new RegExp(`^\\s*${source}\\s*->\\s*${target}\\s*:\\s*(.*)$`, 'm')

  // Récupérer d'éventuelles coordonnées de label existantes pour ne pas les perdre
  let existingLabelX: string | null = null
  let existingLabelY: string | null = null
  if (match && match[1]) {
    const lineMatch = match[1].match(edgeLineRegex)
    if (lineMatch && lineMatch[1]) {
      const lx = lineMatch[1].match(/labelX\s*=\s*(-?\d+)/)
      const ly = lineMatch[1].match(/labelY\s*=\s*(-?\d+)/)
      if (lx) existingLabelX = lx[1]
      if (ly) existingLabelY = ly[1]
    }
  }

  const parts: string[] = []
  if (hasFrom) parts.push(`from=${from}`)
  if (hasTo) parts.push(`to=${to}`)
  if (existingLabelX !== null) parts.push(`labelX=${existingLabelX}`)
  if (existingLabelY !== null) parts.push(`labelY=${existingLabelY}`)

  if (parts.length === 0) {
    if (!match) return sourceCode
    const layoutBody = match[1] ?? ''
    if (edgeLineRegex.test(layoutBody)) {
      const lines = layoutBody.split(/\r\n|\r|\n/).filter((l) => !edgeLineRegex.test(l.trim()))
      const newLayoutBody = lines.filter((l) => l.trim().length > 0).join('\n')
      return sourceCode.replace(layoutRegex, `!LAYOUT\n${newLayoutBody}\n!END`)
    }
    return sourceCode
  }

  const edgeEntry = `${edgeKey}: ${parts.join(', ')}`

  if (!match) {
    const trimmed = sourceCode.trimEnd()
    return `${trimmed}\n\n!LAYOUT\n${edgeEntry}\n!END\n`
  }

  const layoutBody = match[1] ?? ''
  let newLayoutBody: string
  if (edgeLineRegex.test(layoutBody)) {
    newLayoutBody = layoutBody.replace(edgeLineRegex, edgeEntry)
  } else {
    const trimmedBody = layoutBody.trim()
    newLayoutBody = trimmedBody.length > 0 ? `${trimmedBody}\n${edgeEntry}` : edgeEntry
  }

  return sourceCode.replace(layoutRegex, `!LAYOUT\n${newLayoutBody.trim()}\n!END`)
}

/**
 * Met à jour ou insère les coordonnées personnalisées du libellé d'une arête dans !LAYOUT.
 * Si coords est null, retire labelX et labelY tout en préservant from/to.
 * Si la ligne d'arête ne contient plus aucun attribut, elle est supprimée du bloc !LAYOUT.
 */
export function updateNankoSourceEdgeLabelPosition(
  sourceCode: string,
  source: string,
  target: string,
  coords: { x: number; y: number } | null,
): string {
  const edgeKey = `${source}->${target}`
  const layoutRegex = /!LAYOUT([\s\S]*?)!END/
  const match = sourceCode.match(layoutRegex)
  const edgeLineRegex = new RegExp(`^\\s*${source}\\s*->\\s*${target}\\s*:\\s*(.*)$`, 'm')

  let existingFrom: string | null = null
  let existingTo: string | null = null

  if (match && match[1]) {
    const lineMatch = match[1].match(edgeLineRegex)
    if (lineMatch && lineMatch[1]) {
      const fromMatch = lineMatch[1].match(/from\s*=\s*(top|bottom|left|right|auto)/)
      const toMatch = lineMatch[1].match(/to\s*=\s*(top|bottom|left|right|auto)/)
      if (fromMatch) existingFrom = fromMatch[1]
      if (toMatch) existingTo = toMatch[1]
    }
  }

  const parts: string[] = []
  if (existingFrom && isCardinalSide(existingFrom)) parts.push(`from=${existingFrom}`)
  if (existingTo && isCardinalSide(existingTo)) parts.push(`to=${existingTo}`)

  if (coords !== null) {
    parts.push(`labelX=${Math.round(coords.x)}`)
    parts.push(`labelY=${Math.round(coords.y)}`)
  }

  if (parts.length === 0) {
    if (!match) return sourceCode
    const layoutBody = match[1] ?? ''
    if (edgeLineRegex.test(layoutBody)) {
      const lines = layoutBody.split(/\r\n|\r|\n/).filter((l) => !edgeLineRegex.test(l.trim()))
      const newLayoutBody = lines.filter((l) => l.trim().length > 0).join('\n')
      return sourceCode.replace(layoutRegex, `!LAYOUT\n${newLayoutBody}\n!END`)
    }
    return sourceCode
  }

  const edgeEntry = `${edgeKey}: ${parts.join(', ')}`

  if (!match) {
    const trimmed = sourceCode.trimEnd()
    return `${trimmed}\n\n!LAYOUT\n${edgeEntry}\n!END\n`
  }

  const layoutBody = match[1] ?? ''
  let newLayoutBody: string
  if (edgeLineRegex.test(layoutBody)) {
    newLayoutBody = layoutBody.replace(edgeLineRegex, edgeEntry)
  } else {
    const trimmedBody = layoutBody.trim()
    newLayoutBody = trimmedBody.length > 0 ? `${trimmedBody}\n${edgeEntry}` : edgeEntry
  }

  return sourceCode.replace(layoutRegex, `!LAYOUT\n${newLayoutBody.trim()}\n!END`)
}

/**
 * Met à jour ou insère l'ensemble des coordonnées dans la section !LAYOUT ... !END du code .nanko,
 * tout en préservant les lignes d'ancrage d'arêtes existantes.
 */
export function updateNankoSourceBulkLayout(
  sourceCode: string,
  layout: Record<string, { x: number; y: number }>,
): string {
  const nodeEntries = Object.entries(layout)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, pos]) => `${id}: x=${Math.round(pos.x)}, y=${Math.round(pos.y)}`)

  const layoutRegex = /!LAYOUT([\s\S]*?)!END/
  const match = sourceCode.match(layoutRegex)

  let edgeEntries: string[] = []
  if (match && match[1]) {
    edgeEntries = match[1]
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z0-9_-]+\s*->\s*[a-zA-Z0-9_-]+\s*:/.test(l))
  }

  const allEntries = [...nodeEntries, ...edgeEntries].join('\n')

  if (!match) {
    const trimmed = sourceCode.trimEnd()
    return `${trimmed}\n\n!LAYOUT\n${allEntries}\n!END\n`
  }

  return sourceCode.replace(layoutRegex, `!LAYOUT\n${allEntries}\n!END`)
}

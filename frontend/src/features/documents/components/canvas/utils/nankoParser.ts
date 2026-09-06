import type { NankoAst, NankoAstShape, NankoAstConnector } from '../../../schemas'

export interface ParseNankoResult {
  ast: NankoAst
  syntaxError: string | null
}

/**
 * Parseur client pur pour le langage déclaratif .nanko.
 * Extrait shapes, connectors et layout avec détection d'erreurs en temps réel.
 */
export function parseNankoSource(sourceCode: string): ParseNankoResult {
  const lines = sourceCode.split(/\r\n|\r|\n/)
  const shapes: NankoAstShape[] = []
  const connectors: NankoAstConnector[] = []
  const layout: Record<string, { x: number; y: number }> = {}
  const shapeIds = new Set<string>()

  let inLayout = false

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const rawLine = lines[i] ?? ''
    const line = rawLine.trim()

    // Lignes vides ou commentaires
    if (line === '' || line.startsWith('#') || line.startsWith('//')) {
      continue
    }

    // Gestion du bloc !LAYOUT ... !END
    if (line === '!LAYOUT') {
      inLayout = true
      continue
    }
    if (line === '!END' && inLayout) {
      inLayout = false
      continue
    }

    if (inLayout) {
      const layoutMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(?:x=)?(-?\d+)\s*,\s*(?:y=)?(-?\d+)/)
      if (layoutMatch && layoutMatch[1] && layoutMatch[2] && layoutMatch[3]) {
        layout[layoutMatch[1]] = {
          x: parseInt(layoutMatch[2], 10),
          y: parseInt(layoutMatch[3], 10),
        }
      }
      continue
    }

    // Directives de métadonnées (@id, @layer, @version, etc.)
    if (line.startsWith('@')) {
      if (/^@(id|layer|version|satisfies)\s+.+$/.test(line)) {
        continue
      }
      return {
        ast: { shapes, connectors, layout },
        syntaxError: `Ligne ${lineNumber}: Directive métadonnée non reconnue : "${line}"`,
      }
    }

    // 1. Shapes (rectangle, circle, text)
    const shapeMatch = line.match(/^(rectangle|circle|text)\s+([a-zA-Z0-9_-]+)(?:\s+(?:"([^"]*)"|'([^']*)'|(\S+)))?\s*$/)
    if (shapeMatch && shapeMatch[1] && shapeMatch[2]) {
      const type = shapeMatch[1] as 'rectangle' | 'circle' | 'text'
      const id = shapeMatch[2]
      const label = shapeMatch[3] !== undefined && shapeMatch[3] !== ''
        ? shapeMatch[3]
        : (shapeMatch[4] ?? shapeMatch[5] ?? id)

      if (shapeIds.has(id)) {
        return {
          ast: { shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: Une Shape avec l'identifiant "${id}" est déjà déclarée.`,
        }
      }

      shapeIds.add(id)
      shapes.push({ id, type, label })
      continue
    }

    // 2. Connectors (source -> target [label])
    const connMatch = line.match(/^([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s+(?:"([^"]*)"|'([^']*)'|(\S+)))?\s*$/)
    if (connMatch && connMatch[1] && connMatch[2]) {
      const source = connMatch[1]
      const target = connMatch[2]
      const label = connMatch[3] !== undefined && connMatch[3] !== ''
        ? connMatch[3]
        : (connMatch[4] ?? connMatch[5] ?? null)

      if (!shapeIds.has(source)) {
        return {
          ast: { shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: Le connecteur référence une Shape source non déclarée : "${source}".`,
        }
      }

      if (!shapeIds.has(target)) {
        return {
          ast: { shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: Le connecteur référence une Shape cible non déclarée : "${target}".`,
        }
      }

      connectors.push({ source, target, label })
      continue
    }

    // Ligne non reconnue
    return {
      ast: { shapes, connectors, layout },
      syntaxError: `Ligne ${lineNumber}: Instruction non reconnue : "${line}".`,
    }
  }

  return {
    ast: { shapes, connectors, layout },
    syntaxError: null,
  }
}

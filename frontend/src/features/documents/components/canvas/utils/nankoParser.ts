import type { NankoAst, NankoAstShape, NankoAstConnector } from '../../../schemas'

export interface ParseNankoResult {
  ast: NankoAst
  syntaxError: string | null
}

interface ParseAttributesResult {
  attributes: Record<string, string>
  error: string | null
}

function parseAttributes(attrString: string): ParseAttributesResult {
  const attributes: Record<string, string> = {}
  const len = attrString.length
  let i = 0

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(attrString[i]!)) {
      i++
    }
    if (i >= len) {
      break
    }

    // Check if user passed positional quoted string directly (legacy syntax)
    if (attrString[i] === '"' || attrString[i] === "'") {
      return {
        attributes: {},
        error: `Syntaxe invalide : la valeur ${attrString.slice(i)} n'est associée à aucun nom d'attribut (utilisez la syntaxe déclarative clé="valeur", ex: label="...").`,
      }
    }

    // Extract key
    const keyStart = i
    while (i < len && /[a-zA-Z0-9_-]/.test(attrString[i]!)) {
      i++
    }
    const key = attrString.slice(keyStart, i)
    if (!key) {
      return {
        attributes: {},
        error: `Caractère inattendu dans les attributs : "${attrString.slice(i)}".`,
      }
    }

    // Skip whitespace before '='
    while (i < len && /\s/.test(attrString[i]!)) {
      i++
    }

    if (i >= len || attrString[i] !== '=') {
      return {
        attributes: {},
        error: `La valeur de l'attribut '${key}' doit être entourée de guillemets doubles.`,
      }
    }
    i++ // skip '='

    // Skip whitespace after '='
    while (i < len && /\s/.test(attrString[i]!)) {
      i++
    }

    if (i >= len || attrString[i] !== '"') {
      return {
        attributes: {},
        error: `La valeur de l'attribut '${key}' doit être entourée de guillemets doubles.`,
      }
    }
    i++ // skip opening quote '"'

    // Extract value until unescaped '"'
    let val = ''
    let closed = false
    while (i < len) {
      const char = attrString[i]
      if (char === '\\') {
        if (i + 1 < len) {
          const next = attrString[i + 1]
          if (next === '"' || next === '\\') {
            val += next
            i += 2
            continue
          }
        }
        val += char
        i++
        continue
      }
      if (char === '"') {
        closed = true
        i++ // skip closing quote
        break
      }
      val += char
      i++
    }

    if (!closed) {
      return {
        attributes: {},
        error: `Guillemet fermant manquant pour l'attribut '${key}'.`,
      }
    }

    // Next character must be whitespace or end of string
    if (i < len && !/\s/.test(attrString[i]!)) {
      return {
        attributes: {},
        error: `Séparateur manquant après l'attribut '${key}'.`,
      }
    }

    attributes[key] = val
  }

  return { attributes, error: null }
}

/**
 * Parseur client pur pour le langage déclaratif .nanko.
 * Extrait dslVersion, shapes, connectors et layout avec détection d'erreurs en temps réel.
 */
export function parseNankoSource(sourceCode: string): ParseNankoResult {
  const lines = sourceCode.split(/\r\n|\r|\n/)
  const shapes: NankoAstShape[] = []
  const connectors: NankoAstConnector[] = []
  const layout: Record<string, { x: number; y: number }> = {}
  const shapeIds = new Set<string>()
  let dslVersion = 1

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

    // Directives de métadonnées (@id, @layer, @dsl-version, @version, etc.)
    if (line.startsWith('@')) {
      const dslVersionMatch = line.match(/^@dsl-version\s+(\S+)$/)
      if (dslVersionMatch) {
        const val = dslVersionMatch[1]?.trim() ?? ''
        if (!/^\d+$/.test(val) || parseInt(val, 10) !== 1) {
          return {
            ast: { dslVersion, shapes, connectors, layout },
            syntaxError: `Ligne ${lineNumber}: Version de DSL non supportée : '${val}'. Seule la version 1 est actuellement supportée.`,
          }
        }
        dslVersion = parseInt(val, 10)
        continue
      }

      if (/^@(id|layer|version|satisfies)\s+.+$/.test(line)) {
        continue
      }
      return {
        ast: { dslVersion, shapes, connectors, layout },
        syntaxError: `Ligne ${lineNumber}: Directive métadonnée non reconnue : "${line}"`,
      }
    }

    // 1. Shapes (rectangle, circle, text)
    const shapeMatch = line.match(/^(rectangle|circle|text)\s+([a-zA-Z0-9_-]+)(?:\s+(.*))?$/)
    if (shapeMatch && shapeMatch[1] && shapeMatch[2]) {
      const type = shapeMatch[1] as 'rectangle' | 'circle' | 'text'
      const id = shapeMatch[2]
      const attrString = (shapeMatch[3] ?? '').trim()

      if (!attrString) {
        return {
          ast: { dslVersion, shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: L'attribut 'label' est obligatoire pour la shape '${id}'.`,
        }
      }

      const { attributes, error } = parseAttributes(attrString)
      if (error) {
        return {
          ast: { dslVersion, shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: ${error}`,
        }
      }

      const label = attributes['label']
      if (!label || label.trim() === '') {
        return {
          ast: { dslVersion, shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: L'attribut 'label' est obligatoire pour la shape '${id}'.`,
        }
      }

      for (const attrKey of Object.keys(attributes)) {
        if (attrKey !== 'label' && attrKey !== 'desc') {
          return {
            ast: { dslVersion, shapes, connectors, layout },
            syntaxError: `Ligne ${lineNumber}: Attribut non supporté '${attrKey}' pour la shape '${id}'.`,
          }
        }
      }

      if (shapeIds.has(id)) {
        return {
          ast: { dslVersion, shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: Une Shape avec l'identifiant "${id}" est déjà déclarée.`,
        }
      }

      shapeIds.add(id)
      shapes.push({
        id,
        type,
        label,
        desc: attributes['desc'] ?? null,
      })
      continue
    }

    // 2. Connectors (source -> target [attributs])
    const connMatch = line.match(/^([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s+(.*))?$/)
    if (connMatch && connMatch[1] && connMatch[2]) {
      const source = connMatch[1]
      const target = connMatch[2]
      const attrString = (connMatch[3] ?? '').trim()

      if (!shapeIds.has(source)) {
        return {
          ast: { dslVersion, shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: Le connecteur référence une Shape source non déclarée : "${source}".`,
        }
      }

      if (!shapeIds.has(target)) {
        return {
          ast: { dslVersion, shapes, connectors, layout },
          syntaxError: `Ligne ${lineNumber}: Le connecteur référence une Shape cible non déclarée : "${target}".`,
        }
      }

      let label: string | null = null
      let desc: string | null = null

      if (attrString) {
        const { attributes, error } = parseAttributes(attrString)
        if (error) {
          return {
            ast: { dslVersion, shapes, connectors, layout },
            syntaxError: `Ligne ${lineNumber}: ${error}`,
          }
        }

        for (const attrKey of Object.keys(attributes)) {
          if (attrKey !== 'label' && attrKey !== 'desc') {
            return {
              ast: { dslVersion, shapes, connectors, layout },
              syntaxError: `Ligne ${lineNumber}: Attribut non supporté '${attrKey}' pour le connecteur.`,
            }
          }
        }

        if (attributes['desc'] !== undefined && attributes['label'] === undefined) {
          return {
            ast: { dslVersion, shapes, connectors, layout },
            syntaxError: `Ligne ${lineNumber}: Un connecteur ne peut pas déclarer de description ('desc') sans libellé ('label').`,
          }
        }

        label = attributes['label'] ?? null
        desc = attributes['desc'] ?? null
      }

      connectors.push({ source, target, label, desc })
      continue
    }

    // Ligne non reconnue
    return {
      ast: { dslVersion, shapes, connectors, layout },
      syntaxError: `Ligne ${lineNumber}: Instruction non reconnue : "${line}".`,
    }
  }

  return {
    ast: { dslVersion, shapes, connectors, layout },
    syntaxError: null,
  }
}

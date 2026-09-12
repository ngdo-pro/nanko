export interface InsertConnectorResult {
  newSourceCode: string
  alreadyExists: boolean
}

/**
 * Vérifie si une arête source -> target existe déjà dans le corps sémantique du code .nanko
 */
export function checkConnectorExists(sourceCode: string, source: string, target: string): boolean {
  const lines = sourceCode.split(/\r\n|\r|\n/)
  const connectorRegex = new RegExp(`^${source}\\s*->\\s*${target}(?:\\s|$)`)

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '!LAYOUT') {
      break
    }
    if (connectorRegex.test(trimmed)) {
      return true
    }
  }

  return false
}

/**
 * Insère une déclaration de connecteur "source -> target" dans le corps sémantique du code .nanko.
 * Les connecteurs sont regroupés après les shapes et après les connecteurs existants, en amont du bloc !LAYOUT.
 * Si le connecteur existe déjà, l'opération est un no-op avec alreadyExists: true.
 */
export function insertConnectorToSource(
  sourceCode: string,
  source: string,
  target: string,
): InsertConnectorResult {
  if (checkConnectorExists(sourceCode, source, target)) {
    return {
      newSourceCode: sourceCode,
      alreadyExists: true,
    }
  }

  const declaration = `${source} -> ${target}`
  const layoutIndex = sourceCode.indexOf('!LAYOUT')

  let body: string
  let layoutSuffix: string

  if (layoutIndex !== -1) {
    body = sourceCode.slice(0, layoutIndex).trimEnd()
    layoutSuffix = `\n\n${sourceCode.slice(layoutIndex)}`
  } else {
    body = sourceCode.trimEnd()
    layoutSuffix = ''
  }

  const lines = body.length > 0 ? body.split(/\r\n|\r|\n/) : []

  let lastConnectorIdx = -1
  let lastShapeIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? ''
    if (/^[a-zA-Z0-9_-]+\s*->\s*[a-zA-Z0-9_-]+/.test(trimmed)) {
      lastConnectorIdx = i
    } else if (/^(?:rectangle|circle|text)\s+[a-zA-Z0-9_-]+/.test(trimmed)) {
      lastShapeIdx = i
    }
  }

  let updatedBody: string

  if (lastConnectorIdx !== -1) {
    // 1. Il y a déjà des connecteurs : insérer après le dernier connecteur
    lines.splice(lastConnectorIdx + 1, 0, declaration)
    updatedBody = lines.join('\n')
  } else if (lastShapeIdx !== -1) {
    // 2. Il y a des shapes mais pas de connecteur : insérer après avec une ligne vide de séparation
    lines.splice(lastShapeIdx + 1, 0, '', declaration)
    updatedBody = lines.join('\n')
  } else if (lines.length > 0) {
    // 3. Pas de shapes ni connecteurs (uniquement directives ou commentaires)
    lines.push('', declaration)
    updatedBody = lines.join('\n')
  } else {
    // 4. Document vide
    updatedBody = declaration
  }

  return {
    newSourceCode: `${updatedBody}${layoutSuffix}`,
    alreadyExists: false,
  }
}

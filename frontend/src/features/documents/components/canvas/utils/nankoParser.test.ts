import { describe, it, expect } from 'vitest'
import { parseNankoSource } from './nankoParser'

describe('parseNankoSource', () => {
  it('extrait dslVersion, les shapes, connectors avec desc et le layout du code .nanko', () => {
    const code = [
      '@id architecture-globale',
      '@dsl-version 1',
      '@layer 0',
      '',
      'rectangle front label="Frontend Web" desc="Application SPA React"',
      'circle db label="PostgreSQL DB"',
      'text note label="Note d\'architecture"',
      '',
      'front -> db label="SQL Queries" desc="Requêtes via pool"',
      '',
      '!LAYOUT',
      'front: x=100, y=120',
      'db: x=360, y=120',
      '!END',
    ].join('\n')

    const result = parseNankoSource(code)

    expect(result.syntaxError).toBeNull()
    expect(result.ast.dslVersion).toBe(1)
    expect(result.ast.shapes).toHaveLength(3)
    expect(result.ast.shapes[0]).toEqual({
      id: 'front',
      type: 'rectangle',
      label: 'Frontend Web',
      desc: 'Application SPA React',
    })
    expect(result.ast.shapes[1]).toEqual({
      id: 'db',
      type: 'circle',
      label: 'PostgreSQL DB',
      desc: null,
    })
    expect(result.ast.shapes[2]).toEqual({
      id: 'note',
      type: 'text',
      label: "Note d'architecture",
      desc: null,
    })

    expect(result.ast.connectors).toHaveLength(1)
    expect(result.ast.connectors[0]).toEqual({
      source: 'front',
      target: 'db',
      label: 'SQL Queries',
      desc: 'Requêtes via pool',
    })

    expect(result.ast.layout).toEqual({
      front: { x: 100, y: 120 },
      db: { x: 360, y: 120 },
    })
  })

  it('gère les attributs dans un ordre quelconque', () => {
    const code = 'rectangle api desc="API Gateway" label="Gateway"'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toBeNull()
    expect(result.ast.shapes[0]).toEqual({
      id: 'api',
      type: 'rectangle',
      label: 'Gateway',
      desc: 'API Gateway',
    })
  })

  it('prend en charge les guillemets doubles échappés dans la description', () => {
    const code = 'rectangle srv label="Serveur" desc="Module de \\"monitoring\\" système"'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toBeNull()
    expect(result.ast.shapes[0]?.desc).toBe('Module de "monitoring" système')
  })

  it('rejette une valeur non entourée de guillemets doubles', () => {
    const code = 'rectangle api label=Gateway'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain("La valeur de l'attribut 'label' doit être entourée de guillemets doubles.")
  })

  it('rejette une shape sans attribut label obligatoire', () => {
    const code = 'rectangle api desc="Sans label"'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain("L'attribut 'label' est obligatoire pour la shape 'api'.")
  })

  it('rejette un connecteur avec desc mais sans label', () => {
    const code = 'rectangle a label="A"\nrectangle b label="B"\na -> b desc="Flux orphelin"'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain("Un connecteur ne peut pas déclarer de description ('desc') sans libellé ('label').")
  })

  it('accepte un connecteur sans attribut et un connecteur avec label seul', () => {
    const code = 'rectangle a label="A"\nrectangle b label="B"\na -> b\na -> b label="HTTP"'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toBeNull()
    expect(result.ast.connectors).toHaveLength(2)
    expect(result.ast.connectors[0]).toEqual({ source: 'a', target: 'b', label: null, desc: null })
    expect(result.ast.connectors[1]).toEqual({ source: 'a', target: 'b', label: 'HTTP', desc: null })
  })

  it('rejette une version DSL non supportée', () => {
    const code = '@dsl-version 2\nrectangle a label="A"'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain("Version de DSL non supportée : '2'")
  })

  it('détecte une erreur de syntaxe sur une instruction inconnue', () => {
    const code = 'rectangle api label="API"\ninvalide instruction'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain('Ligne 2')
    expect(result.syntaxError).toContain('Instruction non reconnue')
  })

  it('détecte un connecteur référençant une shape inexistante', () => {
    const code = 'rectangle front label="Front"\nfront -> inconnu'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain('inconnu')
  })
})

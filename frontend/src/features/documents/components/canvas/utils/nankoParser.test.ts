import { describe, it, expect } from 'vitest'
import { parseNankoSource } from './nankoParser'

describe('parseNankoSource', () => {
  it('extrait les shapes, connectors et le layout du code .nanko', () => {
    const code = [
      '@id architecture-globale',
      '@layer 0',
      '',
      'rectangle front "Frontend Web"',
      'circle db "PostgreSQL DB"',
      'text note "Note d\'architecture"',
      '',
      'front -> db "SQL Queries"',
      '',
      '!LAYOUT',
      'front: x=100, y=120',
      'db: x=360, y=120',
      '!END',
    ].join('\n')

    const result = parseNankoSource(code)

    expect(result.syntaxError).toBeNull()
    expect(result.ast.shapes).toHaveLength(3)
    expect(result.ast.shapes[0]).toEqual({ id: 'front', type: 'rectangle', label: 'Frontend Web' })
    expect(result.ast.shapes[1]).toEqual({ id: 'db', type: 'circle', label: 'PostgreSQL DB' })
    expect(result.ast.shapes[2]).toEqual({ id: 'note', type: 'text', label: "Note d'architecture" })

    expect(result.ast.connectors).toHaveLength(1)
    expect(result.ast.connectors[0]).toEqual({ source: 'front', target: 'db', label: 'SQL Queries' })

    expect(result.ast.layout).toEqual({
      front: { x: 100, y: 120 },
      db: { x: 360, y: 120 },
    })
  })

  it('gère les shapes sans guillemets ou sans label explicite', () => {
    const code = 'rectangle api Gateway'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toBeNull()
    expect(result.ast.shapes).toHaveLength(1)
    expect(result.ast.shapes[0]).toEqual({ id: 'api', type: 'rectangle', label: 'Gateway' })
  })

  it('détecte une erreur de syntaxe sur une instruction inconnue', () => {
    const code = 'rectangle api "API"\ninvalide instruction'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain('Ligne 2')
    expect(result.syntaxError).toContain('Instruction non reconnue')
  })

  it('détecte un connecteur référençant une shape inexistante', () => {
    const code = 'rectangle front "Front"\nfront -> inconnu'
    const result = parseNankoSource(code)

    expect(result.syntaxError).toContain('inconnu')
  })
})

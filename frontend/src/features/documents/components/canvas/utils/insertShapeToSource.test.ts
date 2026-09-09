import { describe, it, expect } from 'vitest'
import {
  insertShapeToSource,
  extractExistingShapeIds,
  generateUniqueShapeId,
} from './insertShapeToSource'
import { parseNankoSource } from './nankoParser'

describe('insertShapeToSource', () => {
  it('extrait fidèlement les identifiants existants du code source', () => {
    const code = `
@id test-doc
@layer 0

rectangle app "App Web"
circle db "Database"
text notes "Architecture v1"

!LAYOUT
app: x=100, y=200
!END
`
    const ids = extractExistingShapeIds(code)
    expect(ids.has('app')).toBe(true)
    expect(ids.has('db')).toBe(true)
    expect(ids.has('notes')).toBe(true)
    expect(ids.size).toBe(3)
  })

  it('génère un identifiant incrémental sans collision', () => {
    const existing = new Set(['rect_1', 'rect_2'])
    const nextRect = generateUniqueShapeId('rectangle', existing)
    expect(nextRect).toBe('rect_3')

    const nextCircle = generateUniqueShapeId('circle', existing)
    expect(nextCircle).toBe('circle_1')
  })

  it('insère une forme dans un document initialement vide', () => {
    const { newSourceCode, newShapeId } = insertShapeToSource('', {
      type: 'rectangle',
      position: { x: 150, y: 250 },
    })

    expect(newShapeId).toBe('rect_1')
    expect(newSourceCode).toContain('rectangle rect_1 "Rectangle 1"')
    expect(newSourceCode).toContain('!LAYOUT')
    expect(newSourceCode).toContain('rect_1: x=150, y=250')
    expect(newSourceCode).toContain('!END')

    const { ast, syntaxError } = parseNankoSource(newSourceCode)
    expect(syntaxError).toBeNull()
    expect(ast.shapes).toHaveLength(1)
    expect(ast.shapes[0]?.id).toBe('rect_1')
    const layout = ast.layout as Record<string, { x: number; y: number }>
    expect(layout['rect_1']).toEqual({ x: 150, y: 250 })
  })

  it('insère une forme avant le bloc !LAYOUT existant et met à jour les coordonnées', () => {
    const initialCode = `rectangle auth "Authentification"\n\n!LAYOUT\nauth: x=50, y=80\n!END\n`

    const { newSourceCode, newShapeId } = insertShapeToSource(initialCode, {
      type: 'circle',
      position: { x: 300, y: 400 },
      label: 'PostgreSQL DB',
    })

    expect(newShapeId).toBe('circle_1')
    expect(newSourceCode).toContain('circle circle_1 "PostgreSQL DB"')
    expect(newSourceCode).toContain('circle_1: x=300, y=400')
    expect(newSourceCode).toContain('auth: x=50, y=80')

    // S'assure que la déclaration est bien avant !LAYOUT
    const circlePos = newSourceCode.indexOf('circle circle_1')
    const layoutPos = newSourceCode.indexOf('!LAYOUT')
    expect(circlePos).toBeLessThan(layoutPos)

    const { ast, syntaxError } = parseNankoSource(newSourceCode)
    expect(syntaxError).toBeNull()
    expect(ast.shapes).toHaveLength(2)
    const layout = ast.layout as Record<string, { x: number; y: number }>
    expect(layout['circle_1']).toEqual({ x: 300, y: 400 })
    expect(layout['auth']).toEqual({ x: 50, y: 80 })
  })

  it('supporte les nœuds textuels avec label personnalisé', () => {
    const { newSourceCode, newShapeId } = insertShapeToSource('rectangle api "API"', {
      type: 'text',
      position: { x: 10, y: 20 },
      label: 'Note de service',
    })

    expect(newShapeId).toBe('text_1')
    expect(newSourceCode).toContain('text text_1 "Note de service"')
    expect(newSourceCode).toContain('text_1: x=10, y=20')

    const { ast, syntaxError } = parseNankoSource(newSourceCode)
    expect(syntaxError).toBeNull()
    expect(ast.shapes.find((s) => s.id === 'text_1')?.label).toBe('Note de service')
  })

  it('regroupe les shapes ensemble au-dessus des connecteurs', () => {
    const initialCode = `rectangle app "App Web"\n\napp -> db "requête SQL"\n\n!LAYOUT\napp: x=100, y=100\n!END`

    const { newSourceCode, newShapeId } = insertShapeToSource(initialCode, {
      type: 'circle',
      position: { x: 300, y: 300 },
      label: 'Database',
    })

    expect(newShapeId).toBe('circle_1')

    const appIndex = newSourceCode.indexOf('rectangle app')
    const circleIndex = newSourceCode.indexOf('circle circle_1')
    const connIndex = newSourceCode.indexOf('app -> db')

    // La nouvelle shape doit être regroupée avec app, avant les connecteurs
    expect(appIndex).toBeLessThan(circleIndex)
    expect(circleIndex).toBeLessThan(connIndex)
  })
})

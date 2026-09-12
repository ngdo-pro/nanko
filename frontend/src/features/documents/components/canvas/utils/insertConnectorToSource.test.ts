import { describe, it, expect } from 'vitest'
import {
  insertConnectorToSource,
  checkConnectorExists,
} from './insertConnectorToSource'
import { parseNankoSource } from './nankoParser'

describe('insertConnectorToSource', () => {
  it('insère un connecteur dans un document avec des shapes', () => {
    const code = `rectangle app label="Application"
circle db label="Database"

!LAYOUT
app: x=100, y=100
db: x=300, y=100
!END`

    const { newSourceCode, alreadyExists } = insertConnectorToSource(code, 'app', 'db')

    expect(alreadyExists).toBe(false)
    expect(newSourceCode).toContain('app -> db')

    // Vérifie que l'insertion est bien entre les shapes et le bloc !LAYOUT
    const appPos = newSourceCode.indexOf('rectangle app')
    const connPos = newSourceCode.indexOf('app -> db')
    const layoutPos = newSourceCode.indexOf('!LAYOUT')

    expect(appPos).toBeLessThan(connPos)
    expect(connPos).toBeLessThan(layoutPos)

    // Vérifie que le code résultant est syntaxiquement valide
    const { ast, syntaxError } = parseNankoSource(newSourceCode)
    expect(syntaxError).toBeNull()
    expect(ast.connectors).toHaveLength(1)
    expect(ast.connectors[0]).toEqual({
      source: 'app',
      target: 'db',
      label: null,
      desc: null,
    })
  })

  it('ajoute le connecteur à la suite des connecteurs existants', () => {
    const code = `rectangle app label="App"
rectangle svc label="Service"
circle db label="Database"

app -> svc label="HTTP"

!LAYOUT
!END`

    const { newSourceCode, alreadyExists } = insertConnectorToSource(code, 'svc', 'db')

    expect(alreadyExists).toBe(false)
    expect(newSourceCode).toContain('svc -> db')

    const firstConnPos = newSourceCode.indexOf('app -> svc')
    const secondConnPos = newSourceCode.indexOf('svc -> db')
    const layoutPos = newSourceCode.indexOf('!LAYOUT')

    expect(firstConnPos).toBeLessThan(secondConnPos)
    expect(secondConnPos).toBeLessThan(layoutPos)

    const { ast, syntaxError } = parseNankoSource(newSourceCode)
    expect(syntaxError).toBeNull()
    expect(ast.connectors).toHaveLength(2)
  })

  it('détecte un connecteur existant (no-op et alreadyExists: true)', () => {
    const code = `rectangle gateway label="API Gateway"
circle auth label="Auth"

gateway -> auth label="HTTPS"
`
    const { newSourceCode, alreadyExists } = insertConnectorToSource(code, 'gateway', 'auth')

    expect(alreadyExists).toBe(true)
    expect(newSourceCode).toBe(code)
  })

  it('autorise le sens inverse sans le considérer comme un doublon', () => {
    const code = `rectangle a label="A"
rectangle b label="B"

a -> b
`
    const { newSourceCode, alreadyExists } = insertConnectorToSource(code, 'b', 'a')

    expect(alreadyExists).toBe(false)
    expect(newSourceCode).toContain('a -> b')
    expect(newSourceCode).toContain('b -> a')

    const { ast, syntaxError } = parseNankoSource(newSourceCode)
    expect(syntaxError).toBeNull()
    expect(ast.connectors).toHaveLength(2)
  })

  it('supporte un document sans bloc !LAYOUT', () => {
    const code = `rectangle a label="A"\nrectangle b label="B"`
    const { newSourceCode, alreadyExists } = insertConnectorToSource(code, 'a', 'b')

    expect(alreadyExists).toBe(false)
    expect(newSourceCode).toBe(`rectangle a label="A"\nrectangle b label="B"\n\na -> b`)
  })

  it('supporte un document vide', () => {
    const { newSourceCode, alreadyExists } = insertConnectorToSource('', 'source', 'target')

    expect(alreadyExists).toBe(false)
    expect(newSourceCode).toBe('source -> target')
  })

  it('checkConnectorExists détecte précisément les arêtes sans faux positifs sur préfixes', () => {
    const code = `app -> db\napp_worker -> db_replica`

    expect(checkConnectorExists(code, 'app', 'db')).toBe(true)
    expect(checkConnectorExists(code, 'app', 'db_replica')).toBe(false)
    expect(checkConnectorExists(code, 'app_worker', 'db_replica')).toBe(true)
    expect(checkConnectorExists(code, 'ap', 'db')).toBe(false)
  })
})

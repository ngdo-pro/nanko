import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AstInspector } from './AstInspector'
import type { NankoAst } from '../schemas'

describe('AstInspector', () => {
  const sampleAst: NankoAst = {
    dslVersion: 1,
    shapes: [
      { id: 'api', type: 'rectangle', label: 'API Gateway', desc: 'Point d\'entrée HTTPS' },
      { id: 'db', type: 'circle', label: 'PostgreSQL DB', desc: null },
    ],
    connectors: [
      { source: 'api', target: 'db', label: 'SQL', desc: 'Pool de connexions' },
      { source: 'api', target: 'api', label: null, desc: null },
    ],
    layout: {},
  }

  it('affiche le badge de version DSL et les shapes avec desc', () => {
    render(<AstInspector ast={sampleAst} />)

    expect(screen.getByTestId('ast-dsl-version')).toHaveTextContent('DSL v1')
    expect(screen.getByTestId('ast-shape-api')).toBeInTheDocument()
    expect(screen.getByText('Point d\'entrée HTTPS')).toBeInTheDocument()
    expect(screen.getByTestId('ast-shape-db')).toBeInTheDocument()
    expect(screen.getByText(/PostgreSQL DB/)).toBeInTheDocument()
  })

  it('affiche les connecteurs avec leurs labels et descriptions', () => {
    render(<AstInspector ast={sampleAst} />)

    expect(screen.getByTestId('ast-connector-api-db')).toBeInTheDocument()
    expect(screen.getByText('Pool de connexions')).toBeInTheDocument()
  })

  it('affiche l alerte d erreur de syntaxe quand fournie', () => {
    render(<AstInspector ast={sampleAst} syntaxError="Ligne 4: Erreur de test" />)

    expect(screen.getByTestId('syntax-error-alert')).toBeInTheDocument()
    expect(screen.getByText('Ligne 4: Erreur de test')).toBeInTheDocument()
    expect(screen.getByText('Erreur syntaxe')).toBeInTheDocument()
  })
})

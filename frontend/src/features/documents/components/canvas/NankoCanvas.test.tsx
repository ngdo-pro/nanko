import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NankoCanvas } from './NankoCanvas'
import type { NankoAst } from '@/features/documents'

// ResizeObserver mock pour jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('NankoCanvas', () => {
  const sampleAst: NankoAst = {
    shapes: [
      { id: 'front', type: 'rectangle', label: 'Storefront Web' },
      { id: 'db', type: 'circle', label: 'PostgreSQL DB' },
      { id: 'note', type: 'text', label: 'Documentation note' },
    ],
    connectors: [
      { source: 'front', target: 'db', label: 'SQL Query' },
    ],
    layout: {
      front: { x: 100, y: 100 },
      db: { x: 350, y: 100 },
      note: { x: 200, y: 300 },
    },
  }

  it('rend les nœuds avec leurs types respectifs et leurs data-qa', () => {
    render(<NankoCanvas ast={sampleAst} />)

    expect(screen.getByTestId('canvas-node-front')).toBeInTheDocument()
    expect(screen.getByTestId('canvas-node-db')).toBeInTheDocument()
    expect(screen.getByTestId('canvas-node-note')).toBeInTheDocument()

    expect(screen.getByText('Storefront Web')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL DB')).toBeInTheDocument()
    expect(screen.getByText('Documentation note')).toBeInTheDocument()
  })

  it('affiche le badge de pause lorsque syntaxError est présent', () => {
    render(<NankoCanvas ast={sampleAst} syntaxError="Erreur de syntaxe ligne 4" />)

    expect(screen.getByTestId('canvas-syntax-pause-badge')).toBeInTheDocument()
    expect(screen.getByText(/Syntaxe en cours d'édition/i)).toBeInTheDocument()
  })
})

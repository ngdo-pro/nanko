import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    dslVersion: 1,
    shapes: [
      { id: 'front', type: 'rectangle', label: 'Storefront Web', desc: null },
      { id: 'db', type: 'circle', label: 'PostgreSQL DB', desc: null },
      { id: 'note', type: 'text', label: 'Documentation note', desc: null },
    ],
    connectors: [
      { source: 'front', target: 'db', label: 'SQL Query', desc: null },
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

  it('affiche les instructions de création par raccourcis dans l\'état vide', () => {
    const emptyAst: NankoAst = { dslVersion: 1, shapes: [], connectors: [], layout: {} }
    render(<NankoCanvas ast={emptyAst} />)

    expect(screen.getByTestId('canvas-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/Maintenez la touche/i)).toBeInTheDocument()
  })

  it('ouvre la roue radiale au maintien de la touche A et la referme au relâchement', () => {
    const handleCreateShape = vi.fn()
    render(<NankoCanvas ast={sampleAst} onCreateShape={handleCreateShape} />)

    const canvas = screen.getByTestId('nanko-canvas')
    fireEvent.pointerEnter(canvas, { clientX: 200, clientY: 200 })

    // Touche 'a' enfoncée -> la roue radiale s'affiche
    fireEvent.keyDown(window, { key: 'a' })
    expect(screen.getByTestId('radial-menu')).toBeInTheDocument()

    // Touche 'a' relâchée -> la roue radiale disparaît
    fireEvent.keyUp(window, { key: 'a' })
    expect(screen.queryByTestId('radial-menu')).not.toBeInTheDocument()
  })

  it('appelle onCreateShape lors du clic sur un secteur de la roue radiale', () => {
    const handleCreateShape = vi.fn()
    render(<NankoCanvas ast={sampleAst} onCreateShape={handleCreateShape} />)

    const canvas = screen.getByTestId('nanko-canvas')
    fireEvent.pointerEnter(canvas, { clientX: 300, clientY: 250 })

    fireEvent.keyDown(window, { key: 'a' })
    const rectSector = screen.getByTestId('radial-item-rectangle')
    fireEvent.click(rectSector)

    expect(handleCreateShape).toHaveBeenCalledWith('rectangle', expect.any(Object))
    expect(screen.queryByTestId('radial-menu')).not.toBeInTheDocument()
  })

  it('appelle onCreateShape via les raccourcis directs R et C (et ignore T)', () => {
    const handleCreateShape = vi.fn()
    render(<NankoCanvas ast={sampleAst} onCreateShape={handleCreateShape} />)

    const canvas = screen.getByTestId('nanko-canvas')
    fireEvent.pointerEnter(canvas, { clientX: 150, clientY: 150 })

    fireEvent.keyDown(window, { key: 'r' })
    expect(handleCreateShape).toHaveBeenCalledWith('rectangle', expect.any(Object))

    fireEvent.keyDown(window, { key: 'c' })
    expect(handleCreateShape).toHaveBeenCalledWith('circle', expect.any(Object))

    handleCreateShape.mockClear()
    fireEvent.keyDown(window, { key: 't' })
    expect(handleCreateShape).not.toHaveBeenCalled()
  })

  it('crée la forme immédiatement au relâchement de la touche A si un secteur est survolé (geste marking menu)', () => {
    const handleCreateShape = vi.fn()
    render(<NankoCanvas ast={sampleAst} onCreateShape={handleCreateShape} />)

    const canvas = screen.getByTestId('nanko-canvas')
    fireEvent.pointerEnter(canvas, { clientX: 300, clientY: 250 })

    // 1. Maintien de 'a'
    fireEvent.keyDown(window, { key: 'a' })
    expect(screen.getByTestId('radial-menu')).toBeInTheDocument()

    // 2. Survol du secteur rectangle
    const rectSector = screen.getByTestId('radial-item-rectangle')
    fireEvent.mouseEnter(rectSector)

    // 3. Relâchement de la touche 'a'
    fireEvent.keyUp(window, { key: 'a' })

    // 4. La forme est créée sans clic supplémentaire, et le menu est fermé
    expect(handleCreateShape).toHaveBeenCalledWith('rectangle', expect.any(Object))
    expect(screen.queryByTestId('radial-menu')).not.toBeInTheDocument()
  })
})

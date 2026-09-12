import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NankoCanvas } from './NankoCanvas'
import { isValidNankoConnection } from './utils/isValidConnection'
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

  it('rend les sous-titres descriptifs lorsque desc est renseigné dans l\'AST', () => {
    const astWithDesc: NankoAst = {
      dslVersion: 1,
      shapes: [
        { id: 'api', type: 'rectangle', label: 'API Gateway', desc: 'Passerelle publique sécurisée' },
        { id: 'db', type: 'circle', label: 'PostgreSQL', desc: 'Cluster primaire' },
      ],
      connectors: [
        { source: 'api', target: 'db', label: 'SQL', desc: 'PgBouncer port 5432' },
      ],
      layout: {
        api: { x: 100, y: 100 },
        db: { x: 300, y: 100 },
      },
    }

    render(<NankoCanvas ast={astWithDesc} />)

    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.getByText('Passerelle publique sécurisée')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    expect(screen.getByText('Cluster primaire')).toBeInTheDocument()
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

  it('rend 4 poignées d\'ancrage .nanko-handle sur chaque forme du canvas', () => {
    render(<NankoCanvas ast={sampleAst} />)

    const frontNode = screen.getByTestId('canvas-node-front')
    const handles = frontNode.querySelectorAll('.nanko-handle')
    expect(handles.length).toBe(4)

    // Vérification des classes directionnelles Blueprint
    expect(frontNode.querySelector('.nanko-handle-left')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-top')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-right')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-bottom')).toBeInTheDocument()
  })

  describe('isValidNankoConnection [INV-3]', () => {
    const existingEdges = [
      { source: 'front', target: 'db' },
      { source: 'api', target: 'cache' },
    ]

    it('rejette les auto-connexions où source === target', () => {
      expect(isValidNankoConnection({ source: 'front', target: 'front' }, existingEdges)).toBe(false)
      expect(isValidNankoConnection({ source: 'db', target: 'db' }, existingEdges)).toBe(false)
    })

    it('rejette les doublons d\'arêtes dans le même sens', () => {
      expect(isValidNankoConnection({ source: 'front', target: 'db' }, existingEdges)).toBe(false)
      expect(isValidNankoConnection({ source: 'api', target: 'cache' }, existingEdges)).toBe(false)
    })

    it('accepte une nouvelle arête valide entre deux shapes distinctes', () => {
      expect(isValidNankoConnection({ source: 'front', target: 'note' }, existingEdges)).toBe(true)
      expect(isValidNankoConnection({ source: 'note', target: 'db' }, existingEdges)).toBe(true)
    })

    it('accepte une arête inverse même si une connexion existe dans le sens opposé', () => {
      // db -> front est autorisé même si front -> db existe
      expect(isValidNankoConnection({ source: 'db', target: 'front' }, existingEdges)).toBe(true)
    })

    it('rejette si source ou target est absent', () => {
      expect(isValidNankoConnection({ source: null, target: 'db' }, existingEdges)).toBe(false)
      expect(isValidNankoConnection({ source: 'front', target: undefined }, existingEdges)).toBe(false)
      expect(isValidNankoConnection({ source: '', target: 'db' }, existingEdges)).toBe(false)
    })
  })
})

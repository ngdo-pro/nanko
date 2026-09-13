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

  it('rend 5 poignées d\'ancrage (4 cardinales + 1 auto) sur chaque forme du canvas', () => {
    render(<NankoCanvas ast={sampleAst} />)

    const frontNode = screen.getByTestId('canvas-node-front')
    const handles = frontNode.querySelectorAll('.nanko-handle')
    expect(handles.length).toBe(5)

    // Vérification des classes directionnelles Blueprint
    expect(frontNode.querySelector('.nanko-handle-left')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-top')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-right')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-bottom')).toBeInTheDocument()
    expect(frontNode.querySelector('.nanko-handle-auto')).toBeInTheDocument()
  })

  it('rend des poignées distribuées sur une face comptant plusieurs connecteurs (INV-1)', () => {
    const multiAst: NankoAst = {
      shapes: [
        { id: 'gw', type: 'rectangle', label: 'Gateway', desc: null },
        { id: 's1', type: 'rectangle', label: 'S1', desc: null },
        { id: 's2', type: 'rectangle', label: 'S2', desc: null },
        { id: 's3', type: 'rectangle', label: 'S3', desc: null },
      ],
      connectors: [
        { source: 'gw', target: 's1', label: null, desc: null },
        { source: 'gw', target: 's2', label: null, desc: null },
        { source: 'gw', target: 's3', label: null, desc: null },
      ],
      layout: {
        gw: { x: 0, y: 100 },
        s1: { x: 300, y: 0 },
        s2: { x: 300, y: 100 },
        s3: { x: 300, y: 200 },
      },
      edgeLayout: {
        'gw->s1': { from: 'right', to: 'left' },
        'gw->s2': { from: 'right', to: 'left' },
        'gw->s3': { from: 'right', to: 'left' },
      },
      dslVersion: 1,
    }

    render(<NankoCanvas ast={multiAst} />)

    const gwNode = screen.getByTestId('canvas-node-gw')
    // 5 base + 3 distribuées = 8
    const handles = gwNode.querySelectorAll('.nanko-handle')
    expect(handles.length).toBe(8)

    const distributed = gwNode.querySelectorAll('.nanko-handle-distributed')
    expect(distributed.length).toBe(3)
  })

  it('active l auto-scale x2 lorsqu un flanc dépasse 8 connecteurs (INV-2, INV-3)', () => {
    const shapes: NankoAst['shapes'] = [{ id: 'core', type: 'rectangle', label: 'Core', desc: null }]
    const connectors: NankoAst['connectors'] = []
    const layout: Record<string, { x: number; y: number }> = { core: { x: 0, y: 0 } }
    const edgeLayout: NonNullable<NankoAst['edgeLayout']> = {}

    for (let i = 1; i <= 9; i++) {
      const id = `c${i}`
      shapes.push({ id, type: 'rectangle', label: `C${i}`, desc: null })
      connectors.push({ source: 'core', target: id, label: null, desc: null })
      layout[id] = { x: 300, y: i * 40 }
      edgeLayout[`core->${id}`] = { from: 'right', to: 'left' }
    }

    const ast: NankoAst = { shapes, connectors, layout, edgeLayout, dslVersion: 1 }
    render(<NankoCanvas ast={ast} />)

    const coreNode = screen.getByTestId('canvas-node-core')
    expect(coreNode.className).toContain('isScaledY')
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

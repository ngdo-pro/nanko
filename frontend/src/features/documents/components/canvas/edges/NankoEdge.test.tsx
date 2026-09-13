import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Position } from '@xyflow/react'
import { NankoEdge } from './NankoEdge'

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="edge-label-portal">{children}</div>
    ),
    useReactFlow: () => ({
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    }),
  }
})

describe('NankoEdge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ne rend aucun badge si ni label ni desc ne sont renseignés', () => {
    render(
      <svg>
        <NankoEdge
          id="front->db"
          source="front"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={200}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label=""
          data={{ label: null, desc: null }}
        />
      </svg>,
    )

    expect(screen.queryByTestId('ast-connector-front-db')).not.toBeInTheDocument()
  })

  it('applique le token var(--brand) pour la couleur du connecteur', () => {
    const { container } = render(
      <svg>
        <NankoEdge
          id="front->db"
          source="front"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={200}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label=""
          data={{ label: null, desc: null }}
        />
      </svg>,
    )

    const path = container.querySelector('.react-flow__edge-path')
    expect(path).toHaveStyle({ stroke: 'var(--brand)' })
  })

  it('rend une arête sans description : label seul sans préfixe "source -> target", ni indicateur, ni tooltip', () => {
    render(
      <svg>
        <NankoEdge
          id="front->db"
          source="front"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={200}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label="HTTP"
          data={{ label: 'HTTP', desc: null }}
        />
      </svg>,
    )

    expect(screen.getByText('HTTP')).toBeInTheDocument()
    expect(screen.queryByText(/front.*db/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('edge-desc-indicator-front-db')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('rend une arête avec description : pastille indicatrice et tooltip au survol', () => {
    render(
      <svg>
        <NankoEdge
          id="api->db"
          source="api"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={200}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label="SQL"
          data={{ label: 'SQL', desc: 'Connexion PgBouncer port 5432' }}
        />
      </svg>,
    )

    expect(screen.getByText('SQL')).toBeInTheDocument()
    expect(screen.queryByText(/api.*db/)).not.toBeInTheDocument()
    const indicator = screen.getByTestId('edge-desc-indicator-api-db')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveTextContent('•')

    const badgeContainer = screen.getByTestId('ast-connector-api-db')
    fireEvent.mouseEnter(badgeContainer)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByTestId('edge-tooltip-api-db')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Connexion PgBouncer port 5432')
    // Le tooltip affiche bien le flux technique dans son en-tête
    expect(tooltip).toHaveTextContent('api → db')

    fireEvent.mouseLeave(badgeContainer)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByTestId('edge-tooltip-api-db')).not.toBeInTheDocument()
  })

  it('positionne le label à 36px de la source le long du tracé (INV-6)', () => {
    render(
      <svg>
        <NankoEdge
          id="api->db"
          source="api"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label="SQL"
          data={{ label: 'SQL', desc: null }}
        />
      </svg>,
    )

    const badgeContainer = screen.getByTestId('ast-connector-api-db')
    // sourceX = 100, sourcePosition = Right => badgeX = 136, badgeY = 100
    expect(badgeContainer).toHaveStyle({
      transform: 'translate(-50%, -50%) translate(136px,100px)',
    })
  })

  it('ajoute le segment orienté vers le centre quand targetContactOffset est fourni (INV-7)', () => {
    const { container } = render(
      <svg>
        <NankoEdge
          id="gw->circle"
          source="gw"
          target="circle"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label=""
          data={{
            label: null,
            desc: null,
            targetContactOffset: { dx: 6.86, dy: 3.43 },
          }}
        />
      </svg>,
    )

    const path = container.querySelector('.react-flow__edge-path')
    const d = path?.getAttribute('d') ?? ''
    // Le tracé doit se terminer par le segment visant le centre jusqu'au contour du cercle
    expect(d).toContain('L 306.86 103.43')
  })

  it('ajoute le segment source démarrant sur le contour du cercle quand sourceContactOffset est fourni (INV-7)', () => {
    const { container } = render(
      <svg>
        <NankoEdge
          id="circle->db"
          source="circle"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label=""
          data={{
            label: null,
            desc: null,
            sourceContactOffset: { dx: -6.86, dy: -3.43 },
          }}
        />
      </svg>,
    )

    const path = container.querySelector('.react-flow__edge-path')
    const d = path?.getAttribute('d') ?? ''
    // Le tracé doit débuter au point d'impact sur le cercle et passer par la boîte de manipulation
    expect(d).toMatch(/^M\s*93.14\s+96.57\s+L\s+100\s+100/)
  })

  it('insère les arcs de pontet SVG quand data.jumps est fourni (INV-3)', () => {
    const { container } = render(
      <svg>
        <NankoEdge
          id="a->b"
          source="a"
          target="b"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label=""
          data={{
            label: null,
            desc: null,
            jumps: [
              {
                x: 200,
                y: 100,
                segmentIndex: 0,
                orientation: 'horizontal',
                direction: 'positive',
              },
            ],
          }}
        />
      </svg>,
    )

    const path = container.querySelector('.react-flow__edge-path')
    const d = path?.getAttribute('d') ?? ''
    expect(d).toContain('A 6 6 0 0 1')
  })

  it('préserve les pontets et le segment terminal circulaire (INV-5)', () => {
    const { container } = render(
      <svg>
        <NankoEdge
          id="gw->circle"
          source="gw"
          target="circle"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label=""
          data={{
            label: null,
            desc: null,
            targetContactOffset: { dx: 10, dy: 5 },
            jumps: [
              {
                x: 200,
                y: 100,
                segmentIndex: 0,
                orientation: 'horizontal',
                direction: 'positive',
              },
            ],
          }}
        />
      </svg>,
    )

    const path = container.querySelector('.react-flow__edge-path')
    const d = path?.getAttribute('d') ?? ''
    expect(d).toContain('A 6 6 0 0 1')
    expect(d).toContain('L 310 105')
  })

  it('positionne le label selon customLabelPosition quand présent dans data', () => {
    render(
      <svg>
        <NankoEdge
          id="front->db"
          source="front"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label="HTTPS"
          data={{
            label: 'HTTPS',
            customLabelPosition: { x: 222, y: 77 },
          }}
        />
      </svg>,
    )

    const labelContainer = screen.getByTestId('ast-connector-front-db')
    expect(labelContainer).toHaveStyle('transform: translate(-50%, -50%) translate(222px,77px)')
  })

  it('déclenche onLabelPositionChange après un glisser-déposer du badge', () => {
    const onLabelPositionChange = vi.fn()

    render(
      <svg>
        <NankoEdge
          id="front->db"
          source="front"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label="HTTPS"
          data={{
            label: 'HTTPS',
            customLabelPosition: { x: 136, y: 100 },
            onLabelPositionChange,
          }}
        />
      </svg>,
    )

    const badge = screen.getByText('HTTPS').closest('.nanko-edge-label')!
    badge.setPointerCapture = vi.fn()
    badge.releasePointerCapture = vi.fn()

    // Début du drag
    fireEvent.pointerDown(badge, {
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    })

    // Déplacement de +50px en X et +20px en Y
    fireEvent.pointerMove(badge, {
      pointerId: 1,
      clientX: 150,
      clientY: 120,
    })

    // Relâchement
    fireEvent.pointerUp(badge, {
      pointerId: 1,
    })

    expect(onLabelPositionChange).toHaveBeenCalledTimes(1)
    expect(onLabelPositionChange).toHaveBeenCalledWith('front->db', { x: 186, y: 120 })
  })

  it('déclenche onLabelPositionReset lors d un double-clic sur le badge', () => {
    const onLabelPositionReset = vi.fn()

    render(
      <svg>
        <NankoEdge
          id="front->db"
          source="front"
          target="db"
          sourceX={100}
          sourceY={100}
          targetX={300}
          targetY={100}
          sourcePosition={Position.Right}
          targetPosition={Position.Left}
          label="HTTPS"
          data={{
            label: 'HTTPS',
            customLabelPosition: { x: 220, y: 80 },
            onLabelPositionReset,
          }}
        />
      </svg>,
    )

    const badge = screen.getByText('HTTPS').closest('.nanko-edge-label')!
    fireEvent.doubleClick(badge)

    expect(onLabelPositionReset).toHaveBeenCalledTimes(1)
    expect(onLabelPositionReset).toHaveBeenCalledWith('front->db')
  })
})

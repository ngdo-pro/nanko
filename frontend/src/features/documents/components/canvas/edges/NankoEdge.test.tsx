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
})

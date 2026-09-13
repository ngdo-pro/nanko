import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { RectangleNode } from './RectangleNode'

describe('RectangleNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rend la shape sans description : label visible et aucun sous-titre desc', () => {
    render(
      <ReactFlowProvider>
        <RectangleNode
          id="auth"
          data={{ label: 'Auth', desc: null, nodeId: 'auth' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="rectangle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    expect(screen.getByText('Auth')).toBeInTheDocument()
    expect(screen.queryByTestId('node-desc')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('rend la shape avec description et classe de troncature', () => {
    render(
      <ReactFlowProvider>
        <RectangleNode
          id="api"
          data={{ label: 'API Gateway', desc: 'Passerelle publique sécurisée', nodeId: 'api' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="rectangle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    const descEl = screen.getByTestId('node-desc')
    expect(descEl).toBeInTheDocument()
    expect(descEl).toHaveClass('nanko-node-desc')
    expect(descEl).toHaveTextContent('Passerelle publique sécurisée')
  })

  it('déclenche l\'infobulle Blueprint au survol après 300 ms avec le texte intégral', () => {
    render(
      <ReactFlowProvider>
        <RectangleNode
          id="arch"
          data={{
            label: 'Core Service',
            desc: 'Architecture distribuée haute disponibilité',
            nodeId: 'arch',
          }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="rectangle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    const nodeEl = screen.getByTestId('canvas-node-arch')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(nodeEl)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByTestId('node-tooltip-arch')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Architecture distribuée haute disponibilité')

    fireEvent.mouseLeave(nodeEl)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByTestId('node-tooltip-arch')).not.toBeInTheDocument()
  })

  it('dispose de 4 poignées cardinales et 1 poignée centrale auto (INV-1, INV-5)', () => {
    const { container } = render(
      <ReactFlowProvider>
        <RectangleNode
          id="node1"
          data={{ label: 'Node 1', desc: null, nodeId: 'node1' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="rectangle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    const handles = container.querySelectorAll('.nanko-handle')
    expect(handles).toHaveLength(5)
    expect(container.querySelector('.nanko-handle-left')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-top')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-right')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-bottom')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-auto')).toBeInTheDocument()
  })

  it('rend les poignées distribuées et applique les classes d échelle x2 (INV-1, INV-2)', () => {
    const { container } = render(
      <ReactFlowProvider>
        <RectangleNode
          id="gateway"
          data={{
            label: 'Gateway',
            nodeId: 'gateway',
            handles: [
              { id: 'right-1', side: 'right', offsetPercentage: 25 },
              { id: 'right-2', side: 'right', offsetPercentage: 50 },
              { id: 'right-3', side: 'right', offsetPercentage: 75 },
            ],
            scale: {
              isVerticalScaled: true,
              isHorizontalScaled: true,
              isCircleScaled: false,
            },
          }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="rectangle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    // 5 de base + 3 distribuées = 8 poignées
    const handles = container.querySelectorAll('.nanko-handle')
    expect(handles).toHaveLength(8)

    const distributedHandles = container.querySelectorAll('.nanko-handle-distributed')
    expect(distributedHandles).toHaveLength(3)

    const nodeEl = screen.getByTestId('canvas-node-gateway')
    expect(nodeEl.className).toContain('isScaledY')
    expect(nodeEl.className).toContain('isScaledX')
  })
})

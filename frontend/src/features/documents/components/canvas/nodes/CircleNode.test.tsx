import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { CircleNode } from './CircleNode'

describe('CircleNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rend la shape circle sans description', () => {
    render(
      <ReactFlowProvider>
        <CircleNode
          id="db"
          data={{ label: 'PostgreSQL', desc: null, nodeId: 'db' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="circle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    expect(screen.queryByTestId('node-desc')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('rend la shape circle avec description et classe de troncature', () => {
    render(
      <ReactFlowProvider>
        <CircleNode
          id="db"
          data={{ label: 'PostgreSQL', desc: 'Cluster primaire de données', nodeId: 'db' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="circle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    const descEl = screen.getByTestId('node-desc')
    expect(descEl).toBeInTheDocument()
    expect(descEl).toHaveClass('nanko-node-desc')
    expect(descEl).toHaveTextContent('Cluster primaire de données')
  })

  it('affiche le tooltip Blueprint au survol du nœud circulaire', () => {
    render(
      <ReactFlowProvider>
        <CircleNode
          id="db"
          data={{ label: 'PostgreSQL', desc: 'Cluster primaire de données', nodeId: 'db' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="circle"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    const nodeEl = screen.getByTestId('canvas-node-db')
    fireEvent.mouseEnter(nodeEl)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByTestId('node-tooltip-db')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Cluster primaire de données')
  })

  it('dispose de 4 poignées cardinales et 1 poignée centrale auto (INV-1, INV-5)', () => {
    const { container } = render(
      <ReactFlowProvider>
        <CircleNode
          id="c1"
          data={{ label: 'C1', desc: null, nodeId: 'c1' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="circle"
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
})

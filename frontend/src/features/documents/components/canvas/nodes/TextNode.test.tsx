import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { TextNode } from './TextNode'

describe('TextNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rend la shape text sans description', () => {
    render(
      <ReactFlowProvider>
        <TextNode
          id="note"
          data={{ label: 'Architecture Note', desc: null, nodeId: 'note' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="text"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    expect(screen.getByText('Architecture Note')).toBeInTheDocument()
    expect(screen.queryByTestId('node-desc')).not.toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('rend la shape text avec description et classe de troncature', () => {
    render(
      <ReactFlowProvider>
        <TextNode
          id="note"
          data={{ label: 'Architecture Note', desc: 'Détails de conception v1', nodeId: 'note' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="text"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    expect(screen.getByText('Architecture Note')).toBeInTheDocument()
    const descEl = screen.getByTestId('node-desc')
    expect(descEl).toBeInTheDocument()
    expect(descEl).toHaveClass('nanko-node-desc')
    expect(descEl).toHaveTextContent('Détails de conception v1')
  })

  it('affiche le tooltip Blueprint au survol du nœud text', () => {
    render(
      <ReactFlowProvider>
        <TextNode
          id="note"
          data={{ label: 'Architecture Note', desc: 'Détails de conception v1', nodeId: 'note' }}
          selected={false}
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          type="text"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    const nodeEl = screen.getByTestId('canvas-node-note')
    fireEvent.mouseEnter(nodeEl)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByTestId('node-tooltip-note')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Détails de conception v1')
  })
})

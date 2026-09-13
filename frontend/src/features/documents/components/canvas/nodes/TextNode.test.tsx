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

  it('dispose de 4 poignées cardinales et 1 poignée centrale auto (INV-1, INV-5)', () => {
    const { container } = render(
      <ReactFlowProvider>
        <TextNode
          id="t1"
          data={{ label: 'T1', desc: null, nodeId: 't1' }}
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

    const handles = container.querySelectorAll('.nanko-handle')
    expect(handles).toHaveLength(5)
    expect(container.querySelector('.nanko-handle-left')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-top')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-right')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-bottom')).toBeInTheDocument()
    expect(container.querySelector('.nanko-handle-auto')).toBeInTheDocument()
  })

  it('rend les poignées distribuées et applique les classes isScaledX et isScaledY (INV-1, INV-2)', () => {
    const { container } = render(
      <ReactFlowProvider>
        <TextNode
          id="note"
          data={{
            label: 'Note',
            nodeId: 'note',
            handles: [
              { id: 'top-1', side: 'top', offsetPercentage: 33.33 },
              { id: 'top-2', side: 'top', offsetPercentage: 66.67 },
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
          type="text"
          dragging={false}
          selectable={true}
          deletable={true}
          draggable={true}
        />
      </ReactFlowProvider>,
    )

    // INV-5 : Strictement 5 handles de création interactives (.nanko-handle)
    const handles = container.querySelectorAll('.nanko-handle')
    expect(handles).toHaveLength(5)

    // Les points d'attache distribués sont passifs (.nanko-passive-anchor)
    const passiveAnchors = container.querySelectorAll('.nanko-passive-anchor')
    expect(passiveAnchors).toHaveLength(2)

    const nodeEl = screen.getByTestId('canvas-node-note')
    expect(nodeEl.className).toContain('isScaledX')
    expect(nodeEl.className).toContain('isScaledY')
  })
})


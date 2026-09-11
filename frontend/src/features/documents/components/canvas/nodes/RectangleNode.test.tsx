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
})

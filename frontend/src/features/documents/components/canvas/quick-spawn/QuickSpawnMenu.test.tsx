import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickSpawnMenu } from './QuickSpawnMenu'

describe('QuickSpawnMenu', () => {
  it('rend les options Rectangle et Cercle avec leurs badges de raccourcis', () => {
    render(<QuickSpawnMenu x={150} y={200} onSelect={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByTestId('quick-spawn-menu')).toBeInTheDocument()
    expect(screen.getByTestId('quick-spawn-rectangle')).toHaveTextContent('Rectangle')
    expect(screen.getByTestId('quick-spawn-rectangle')).toHaveTextContent('R')
    expect(screen.getByTestId('quick-spawn-circle')).toHaveTextContent('Cercle')
    expect(screen.getByTestId('quick-spawn-circle')).toHaveTextContent('C')
  })

  it('appelle onSelect("rectangle") au clic sur le bouton Rectangle', () => {
    const onSelect = vi.fn()
    render(<QuickSpawnMenu x={150} y={200} onSelect={onSelect} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByTestId('quick-spawn-rectangle'))
    expect(onSelect).toHaveBeenCalledWith('rectangle')
  })

  it('appelle onSelect("circle") au clic sur le bouton Cercle', () => {
    const onSelect = vi.fn()
    render(<QuickSpawnMenu x={150} y={200} onSelect={onSelect} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByTestId('quick-spawn-circle'))
    expect(onSelect).toHaveBeenCalledWith('circle')
  })

  it('déclenche onSelect("rectangle") lors de la frappe de la touche R', () => {
    const onSelect = vi.fn()
    render(<QuickSpawnMenu x={150} y={200} onSelect={onSelect} onCancel={vi.fn()} />)

    fireEvent.keyDown(window, { key: 'r' })
    expect(onSelect).toHaveBeenCalledWith('rectangle')
  })

  it('déclenche onSelect("circle") lors de la frappe de la touche C', () => {
    const onSelect = vi.fn()
    render(<QuickSpawnMenu x={150} y={200} onSelect={onSelect} onCancel={vi.fn()} />)

    fireEvent.keyDown(window, { key: 'c' })
    expect(onSelect).toHaveBeenCalledWith('circle')
  })

  it('déclenche onCancel lors de la frappe de la touche Escape', () => {
    const onCancel = vi.fn()
    render(<QuickSpawnMenu x={150} y={200} onSelect={vi.fn()} onCancel={onCancel} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('déclenche onCancel lors d un clic à l extérieur', () => {
    const onCancel = vi.fn()
    render(
      <div>
        <div data-qa="outside-area" data-testid="outside-area">Outside</div>
        <QuickSpawnMenu x={150} y={200} onSelect={vi.fn()} onCancel={onCancel} />
      </div>,
    )

    fireEvent.pointerDown(screen.getByTestId('outside-area'))
    expect(onCancel).toHaveBeenCalled()
  })
})

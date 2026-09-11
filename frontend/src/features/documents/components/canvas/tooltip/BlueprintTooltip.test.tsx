import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BlueprintTooltip } from './BlueprintTooltip'
import { useHoverTooltip } from './useHoverTooltip'

const TestHoverComponent = ({ desc }: { desc?: string | null }) => {
  const { isVisible, handleMouseEnter, handleMouseLeave } = useHoverTooltip(300)

  return (
    <div
      data-qa="test-target"
      onMouseEnter={desc ? handleMouseEnter : undefined}
      onMouseLeave={desc ? handleMouseLeave : undefined}
    >
      <span>Trigger</span>
      {isVisible && desc && (
        <BlueprintTooltip
          typeBadge="rectangle"
          id="gateway"
          title="API Gateway"
          desc={desc}
          dataQa="node-tooltip-gateway"
        />
      )}
    </div>
  )
}

describe('BlueprintTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ne rend rien si desc est vide ou nulle', () => {
    render(
      <BlueprintTooltip
        typeBadge="rectangle"
        id="gateway"
        title="API Gateway"
        desc={null}
        dataQa="node-tooltip-gateway"
      />,
    )

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('rend l\'infobulle avec le badge, l\'identifiant, le titre et la description', () => {
    render(
      <BlueprintTooltip
        typeBadge="rectangle"
        id="gateway"
        title="API Gateway"
        desc="Point d'entrée HTTPS public avec terminaison TLS"
        dataQa="node-tooltip-gateway"
      />,
    )

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveAttribute('data-qa', 'node-tooltip-gateway')

    expect(screen.getByText('rectangle')).toBeInTheDocument()
    expect(screen.getByText('gateway')).toBeInTheDocument()
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.getByText("Point d'entrée HTTPS public avec terminaison TLS")).toBeInTheDocument()
  })

  it('déclenche l\'affichage du tooltip après 300 ms de survol (anti-scintillement)', () => {
    render(<TestHoverComponent desc="Passerelle haute disponibilité" />)

    const trigger = screen.getByTestId('test-target')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(trigger)

    // Après 200 ms, toujours pas visible
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    // Après 300 ms au total, le tooltip apparaît
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Passerelle haute disponibilité')).toBeInTheDocument()

    // Au mouseLeave, le tooltip disparaît immédiatement
    fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('annule l\'affichage du tooltip si la souris quitte avant 300 ms', () => {
    render(<TestHoverComponent desc="Description courte" />)

    const trigger = screen.getByTestId('test-target')
    fireEvent.mouseEnter(trigger)

    act(() => {
      vi.advanceTimersByTime(150)
    })
    fireEvent.mouseLeave(trigger)

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

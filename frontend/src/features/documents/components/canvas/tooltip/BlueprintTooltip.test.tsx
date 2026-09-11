import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BlueprintTooltip } from './BlueprintTooltip'
import { useHoverTooltip } from './useHoverTooltip'

const TestHoverComponent = ({ desc }: { desc?: string | null }) => {
  const {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useHoverTooltip(300)

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
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
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

  it('déclenche l\'affichage du tooltip après 300 ms de survol (anti-scintillement) et applique le délai de grâce au départ', () => {
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

    // Au mouseLeave, le tooltip reste visible pendant le délai de grâce (250 ms)
    fireEvent.mouseLeave(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('permet le survol du tooltip pendant le délai de grâce et maintient son affichage', () => {
    render(<TestHoverComponent desc="Passerelle avec texte long et défilement" />)

    const trigger = screen.getByTestId('test-target')
    fireEvent.mouseEnter(trigger)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()

    // Le curseur quitte le déclencheur pour transiter vers le tooltip
    fireEvent.mouseLeave(trigger)
    act(() => {
      vi.advanceTimersByTime(100) // dans les 250 ms de grâce
    })
    // Le curseur entre sur le tooltip
    fireEvent.mouseEnter(tooltip)

    // Le délai de grâce initial s'écoule entièrement mais le tooltip reste ouvert
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    // Quand le curseur quitte le tooltip, il disparaît après le délai de grâce
    fireEvent.mouseLeave(tooltip)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('affiche l\'indicateur de défilement visuel pour les descriptions longues (> 120 caractères)', () => {
    const longDesc = 'A'.repeat(150)
    render(
      <BlueprintTooltip
        typeBadge="rectangle"
        id="gateway"
        title="API Gateway"
        desc={longDesc}
        dataQa="node-tooltip-gateway"
      />,
    )

    const indicator = screen.getByTestId('tooltip-scroll-indicator')
    expect(indicator).toBeInTheDocument()
    expect(screen.getByText('↕ Survolez pour faire défiler')).toBeInTheDocument()

    // Au survol du tooltip, le texte d'invite bascule en état actif
    const tooltip = screen.getByRole('tooltip')
    fireEvent.mouseEnter(tooltip)
    expect(screen.getByText('↕ Défilement actif')).toBeInTheDocument()
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

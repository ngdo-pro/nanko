import { describe, it, expect } from 'vitest'
import { calculateDagreLayout } from './dagreLayout'
import type { Node, Edge } from '@xyflow/react'

describe('calculateDagreLayout', () => {
  it('calcule les coordonnées de nœuds connectés de gauche à droite (LR)', () => {
    const nodes: Node[] = [
      { id: 'nodeA', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
      { id: 'nodeB', position: { x: 0, y: 0 }, data: { label: 'Node B' } },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'nodeA', target: 'nodeB' },
    ]

    const result = calculateDagreLayout(nodes, edges, { direction: 'LR' })

    expect(result).toHaveLength(2)
    const nodeA = result.find((n) => n.id === 'nodeA')
    const nodeB = result.find((n) => n.id === 'nodeB')

    expect(nodeA).toBeDefined()
    expect(nodeB).toBeDefined()
    // En direction LR, nodeB doit être à droite de nodeA
    expect(nodeB!.position.x).toBeGreaterThan(nodeA!.position.x)
  })

  it('gère une liste vide de nœuds sans erreur', () => {
    const result = calculateDagreLayout([], [])
    expect(result).toEqual([])
  })
})

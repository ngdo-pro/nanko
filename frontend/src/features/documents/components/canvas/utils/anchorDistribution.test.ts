import { describe, it, expect } from 'vitest'
import {
  computeAnchorDistribution,
  CAPACITY_THRESHOLD,
} from './anchorDistribution'
import type { NankoAst } from '@/features/documents'
import type { Node } from '@xyflow/react'

describe('anchorDistribution', () => {
  it('assigns standard cardinal handles when a flank has at most 1 connector', () => {
    const ast: NankoAst = {
      shapes: [
        { id: 'gateway', type: 'rectangle', label: 'Gateway', desc: null },
        { id: 'auth', type: 'rectangle', label: 'Auth', desc: null },
      ],
      connectors: [
        { source: 'gateway', target: 'auth', label: null, desc: null },
      ],
      edgeLayout: {
        'gateway->auth': { from: 'right', to: 'left' },
      },
      dslVersion: 1,
    }

    const nodes: Node[] = [
      { id: 'gateway', type: 'rectangle', position: { x: 0, y: 0 }, data: {} },
      { id: 'auth', type: 'rectangle', position: { x: 300, y: 0 }, data: {} },
    ]

    const result = computeAnchorDistribution(ast, nodes)

    // Pas de poignées distribuées supplémentaires si 1 seul connecteur
    expect(result.nodeHandles.get('gateway')).toEqual([])
    expect(result.nodeHandles.get('auth')).toEqual([])

    // L'assignation utilise le flanc cardinal direct
    const assignment = result.edgeAssignments.get('gateway->auth')
    expect(assignment?.sourceHandle).toBe('right')
    expect(assignment?.targetHandle).toBe('left')

    // Aucune échelle x2
    expect(result.nodeScale.get('gateway')?.isVerticalScaled).toBe(false)
    expect(result.nodeScale.get('gateway')?.isHorizontalScaled).toBe(false)
  })

  it('distributes 3 connectors on a flank at 25%, 50%, and 75% (INV-1)', () => {
    const ast: NankoAst = {
      shapes: [
        { id: 'gateway', type: 'rectangle', label: 'Gateway', desc: null },
        { id: 'svc1', type: 'rectangle', label: 'Service 1', desc: null },
        { id: 'svc2', type: 'rectangle', label: 'Service 2', desc: null },
        { id: 'svc3', type: 'rectangle', label: 'Service 3', desc: null },
      ],
      connectors: [
        { source: 'gateway', target: 'svc1', label: null, desc: null },
        { source: 'gateway', target: 'svc2', label: null, desc: null },
        { source: 'gateway', target: 'svc3', label: null, desc: null },
      ],
      edgeLayout: {
        'gateway->svc1': { from: 'right', to: 'left' },
        'gateway->svc2': { from: 'right', to: 'left' },
        'gateway->svc3': { from: 'right', to: 'left' },
      },
      dslVersion: 1,
    }

    // Positions distinctes en Y pour tester l'ordonnancement sans croisement
    const nodes: Node[] = [
      { id: 'gateway', type: 'rectangle', position: { x: 0, y: 100 }, data: {} },
      { id: 'svc1', type: 'rectangle', position: { x: 300, y: 200 }, data: {} },
      { id: 'svc2', type: 'rectangle', position: { x: 300, y: 0 }, data: {} },
      { id: 'svc3', type: 'rectangle', position: { x: 300, y: 100 }, data: {} },
    ]

    const result = computeAnchorDistribution(ast, nodes)
    const gatewayHandles = result.nodeHandles.get('gateway') ?? []

    expect(gatewayHandles.length).toBe(3)

    // svc2 est le plus haut (y=0) -> slot 25%
    // svc3 est au milieu (y=100) -> slot 50%
    // svc1 est le plus bas (y=200) -> slot 75%
    expect(gatewayHandles[0].id).toBe('right-gateway->svc2')
    expect(gatewayHandles[0].offsetPercentage).toBe(25)

    expect(gatewayHandles[1].id).toBe('right-gateway->svc3')
    expect(gatewayHandles[1].offsetPercentage).toBe(50)

    expect(gatewayHandles[2].id).toBe('right-gateway->svc1')
    expect(gatewayHandles[2].offsetPercentage).toBe(75)

    // Vérifier les assignations d'arêtes
    expect(result.edgeAssignments.get('gateway->svc2')?.sourceHandle).toBe('right-gateway->svc2')
    expect(result.edgeAssignments.get('gateway->svc3')?.sourceHandle).toBe('right-gateway->svc3')
    expect(result.edgeAssignments.get('gateway->svc1')?.sourceHandle).toBe('right-gateway->svc1')
  })

  it('triggers auto-scale x2 on vertical flank when connector count exceeds 8 (INV-2)', () => {
    const connectors: NankoAst['connectors'] = []
    const shapes: NankoAst['shapes'] = [{ id: 'hub', type: 'rectangle', label: 'Hub', desc: null }]
    const nodes: Node[] = [{ id: 'hub', type: 'rectangle', position: { x: 0, y: 0 }, data: {} }]
    const edgeLayout: NonNullable<NankoAst['edgeLayout']> = {}

    // Créer 9 connecteurs sur le flanc droit
    for (let i = 1; i <= 9; i++) {
      const id = `worker${i}`
      shapes.push({ id, type: 'rectangle', label: `Worker ${i}`, desc: null })
      connectors.push({ source: 'hub', target: id, label: null, desc: null })
      nodes.push({ id, type: 'rectangle', position: { x: 300, y: i * 50 }, data: {} })
      edgeLayout[`hub->${id}`] = { from: 'right', to: 'left' }
    }

    const ast: NankoAst = { shapes, connectors, edgeLayout, dslVersion: 1 }
    const result = computeAnchorDistribution(ast, nodes)

    const hubScale = result.nodeScale.get('hub')
    expect(hubScale?.isVerticalScaled).toBe(true)
    expect(hubScale?.isHorizontalScaled).toBe(false)

    // 9 connecteurs -> 9 poignées réparties à 1/10, 2/10, ..., 9/10
    const hubHandles = result.nodeHandles.get('hub') ?? []
    expect(hubHandles.length).toBe(9)
    expect(hubHandles[0].offsetPercentage).toBe(10)
    expect(hubHandles[8].offsetPercentage).toBe(90)
  })

  it('triggers auto-scale x2 on circle shape and calculates curved perimeter positions (INV-3)', () => {
    const connectors: NankoAst['connectors'] = []
    const shapes: NankoAst['shapes'] = [{ id: 'circleNode', type: 'circle', label: 'Circle', desc: null }]
    const nodes: Node[] = [{ id: 'circleNode', type: 'circle', position: { x: 0, y: 0 }, data: {} }]
    const edgeLayout: NonNullable<NankoAst['edgeLayout']> = {}

    for (let i = 1; i <= 9; i++) {
      const id = `target${i}`
      shapes.push({ id, type: 'rectangle', label: `Target ${i}`, desc: null })
      connectors.push({ source: 'circleNode', target: id, label: null, desc: null })
      nodes.push({ id, type: 'rectangle', position: { x: 300, y: i * 40 }, data: {} })
      edgeLayout[`circleNode->${id}`] = { from: 'right', to: 'left' }
    }

    const ast: NankoAst = { shapes, connectors, edgeLayout, dslVersion: 1 }
    const result = computeAnchorDistribution(ast, nodes)

    const circleScale = result.nodeScale.get('circleNode')
    expect(circleScale?.isCircleScaled).toBe(true)

    const circleHandles = result.nodeHandles.get('circleNode') ?? []
    expect(circleHandles.length).toBe(9)

    // Le handle du milieu (slot 5, à 50% en Y) doit être exactement à x = 100% (tangent droit)
    const midHandle = circleHandles[4]
    expect(midHandle.offsetPercentage).toBe(50)
    expect(midHandle.circleLeftPercentage).toBe(100) // (0.5 + 0.5) * 100%

    // Les handles extrêmes (10% et 90%) doivent être rentrés par rapport au bord droit
    expect(circleHandles[0].circleLeftPercentage).toBeLessThan(100)
    expect(circleHandles[8].circleLeftPercentage).toBeLessThan(100)
  })

  it('triggers horizontal scale x2 when top or bottom flank exceeds 8 connectors', () => {
    const connectors: NankoAst['connectors'] = []
    const shapes: NankoAst['shapes'] = [{ id: 'router', type: 'rectangle', label: 'Router', desc: null }]
    const nodes: Node[] = [{ id: 'router', type: 'rectangle', position: { x: 0, y: 0 }, data: {} }]
    const edgeLayout: NonNullable<NankoAst['edgeLayout']> = {}

    for (let i = 1; i <= CAPACITY_THRESHOLD + 1; i++) {
      const id = `client${i}`
      shapes.push({ id, type: 'rectangle', label: `Client ${i}`, desc: null })
      connectors.push({ source: 'router', target: id, label: null, desc: null })
      nodes.push({ id, type: 'rectangle', position: { x: i * 50, y: 200 }, data: {} })
      edgeLayout[`router->${id}`] = { from: 'bottom', to: 'top' }
    }

    const ast: NankoAst = { shapes, connectors, edgeLayout, dslVersion: 1 }
    const result = computeAnchorDistribution(ast, nodes)

    const routerScale = result.nodeScale.get('router')
    expect(routerScale?.isHorizontalScaled).toBe(true)
    expect(routerScale?.isVerticalScaled).toBe(false)
  })

  it('calculates perimeter contact points on top and bottom flanks for circle shapes (INV-7)', () => {
    const ast: NankoAst = {
      shapes: [
        { id: 'center', type: 'circle', label: 'Center', desc: null },
        { id: 'top1', type: 'rectangle', label: 'Top 1', desc: null },
        { id: 'top2', type: 'rectangle', label: 'Top 2', desc: null },
        { id: 'bottom1', type: 'rectangle', label: 'Bottom 1', desc: null },
        { id: 'bottom2', type: 'rectangle', label: 'Bottom 2', desc: null },
      ],
      connectors: [
        { source: 'center', target: 'top1', label: null, desc: null },
        { source: 'center', target: 'top2', label: null, desc: null },
        { source: 'center', target: 'bottom1', label: null, desc: null },
        { source: 'center', target: 'bottom2', label: null, desc: null },
      ],
      edgeLayout: {
        'center->top1': { from: 'top', to: 'bottom' },
        'center->top2': { from: 'top', to: 'bottom' },
        'center->bottom1': { from: 'bottom', to: 'top' },
        'center->bottom2': { from: 'bottom', to: 'top' },
      },
      dslVersion: 1,
    }

    const nodes: Node[] = [
      { id: 'center', type: 'circle', position: { x: 200, y: 200 }, data: {} },
      { id: 'top1', type: 'rectangle', position: { x: 100, y: 0 }, data: {} },
      { id: 'top2', type: 'rectangle', position: { x: 300, y: 0 }, data: {} },
      { id: 'bottom1', type: 'rectangle', position: { x: 100, y: 400 }, data: {} },
      { id: 'bottom2', type: 'rectangle', position: { x: 300, y: 400 }, data: {} },
    ]

    const result = computeAnchorDistribution(ast, nodes)
    const handles = result.nodeHandles.get('center') ?? []

    // 2 on top (slots at 33.33% and 66.67%), 2 on bottom (slots at 33.33% and 66.67%)
    const topHandles = handles.filter((h) => h.side === 'top')
    const bottomHandles = handles.filter((h) => h.side === 'bottom')

    expect(topHandles.length).toBe(2)
    expect(bottomHandles.length).toBe(2)

    // On top flank, circleTopPercentage must be > 0 (curved inward from top edge y=0)
    expect(topHandles[0].circleTopPercentage).toBeGreaterThan(0)
    expect(topHandles[0].circleTopPercentage).toBeLessThan(50)
    expect(topHandles[0].circleLeftPercentage).toBeCloseTo(34.19, 1)

    // On bottom flank, circleTopPercentage must be < 100 (curved inward from bottom edge y=100)
    expect(bottomHandles[0].circleTopPercentage).toBeLessThan(100)
    expect(bottomHandles[0].circleTopPercentage).toBeGreaterThan(50)
    expect(bottomHandles[0].circleLeftPercentage).toBeCloseTo(34.19, 1)
  })
})

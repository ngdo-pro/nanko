import { describe, it, expect, vi } from 'vitest'
import { buildEdgesFromAst } from './buildEdgesFromAst'
import type { NankoAst } from '@/features/documents'
import type { Node } from '@xyflow/react'

describe('buildEdgesFromAst', () => {
  const baseAst: NankoAst = {
    dslVersion: 1,
    shapes: [
      { id: 'gateway', type: 'rectangle', label: 'Gateway', desc: 'API Entry' },
      { id: 'auth', type: 'circle', label: 'Auth', desc: null },
    ],
    connectors: [
      { source: 'gateway', target: 'auth', label: 'HTTPS', desc: 'OAuth2 Tokens' },
    ],
    layout: {
      gateway: { x: 50, y: 100 },
      auth: { x: 350, y: 100 },
    },
    edgeLayout: {
      'gateway->auth': {
        from: 'right',
        to: 'left',
        labelX: 210,
        labelY: 95,
      },
    },
  }

  const nodes: Node[] = [
    { id: 'gateway', type: 'rectangle', position: { x: 50, y: 100 }, data: { label: 'Gateway', shapeType: 'rectangle' } },
    { id: 'auth', type: 'circle', position: { x: 350, y: 100 }, data: { label: 'Auth', shapeType: 'circle' } },
  ]

  it('génère les arêtes avec customLabelPosition et les données de label/desc', () => {
    const onEdgeLabelPositionChange = vi.fn()
    const onEdgeLabelPositionReset = vi.fn()

    const edges = buildEdgesFromAst(
      baseAst,
      nodes,
      'dark',
      undefined,
      null,
      onEdgeLabelPositionChange,
      onEdgeLabelPositionReset,
    )

    expect(edges).toHaveLength(1)
    const edge = edges[0]!
    expect(edge.id).toBe('gateway->auth')
    expect(edge.label).toBe('HTTPS')
    expect(edge.data?.customLabelPosition).toEqual({ x: 210, y: 95 })
    expect(edge.data?.desc).toBe('OAuth2 Tokens')
    expect(edge.data?.onLabelPositionChange).toBe(onEdgeLabelPositionChange)
    expect(edge.data?.onLabelPositionReset).toBe(onEdgeLabelPositionReset)
  })

  it('retourne customLabelPosition null si ni labelX ni labelY ne sont définis', () => {
    const astWithoutLabelPos: NankoAst = {
      ...baseAst,
      edgeLayout: {
        'gateway->auth': { from: 'right', to: 'left' },
      },
    }

    const edges = buildEdgesFromAst(astWithoutLabelPos, nodes, 'light')
    expect(edges[0]?.data?.customLabelPosition).toBeNull()
  })

  it('attribue le zIndex 1000 à l arête active au survol', () => {
    const edges = buildEdgesFromAst(baseAst, nodes, 'dark', undefined, 'gateway->auth')
    expect(edges[0]?.zIndex).toBe(1000)
  })
})

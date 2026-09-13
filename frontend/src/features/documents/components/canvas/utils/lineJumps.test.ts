import { describe, it, expect } from 'vitest'
import {
  extractPathPoints,
  extractOrthogonalSegments,
  findOrthogonalIntersection,
  computeEdgeCrossovers,
  applyLineJumpsToPath,
  computeAstEdgeCrossovers,
  DEFAULT_LINE_JUMP_RADIUS,
} from './lineJumps'

describe('lineJumps utility', () => {
  describe('extractPathPoints', () => {
    it('extrait les points à partir d un chemin SVG standard', () => {
      const path = 'M 10 20 L 50 20 L 50 80 L 100 80'
      const points = extractPathPoints(path)
      expect(points).toEqual([
        { x: 10, y: 20 },
        { x: 50, y: 20 },
        { x: 50, y: 80 },
        { x: 100, y: 80 },
      ])
    })

    it('gère les virgules et les nombres décimaux', () => {
      const path = 'M 10.5,20.25 L 50.75,20.25'
      const points = extractPathPoints(path)
      expect(points).toEqual([
        { x: 10.5, y: 20.25 },
        { x: 50.75, y: 20.25 },
      ])
    })
  })

  describe('extractOrthogonalSegments', () => {
    it('catégorise correctement les segments horizontaux et verticaux', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
      ]
      const segments = extractOrthogonalSegments(points)
      expect(segments).toHaveLength(2)
      expect(segments[0].orientation).toBe('horizontal')
      expect(segments[1].orientation).toBe('vertical')
    })
  })

  describe('findOrthogonalIntersection', () => {
    it('calcule le point de croisement exact entre un segment horizontal et un vertical', () => {
      const segH = {
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 },
        orientation: 'horizontal' as const,
      }
      const segV = {
        start: { x: 50, y: 0 },
        end: { x: 50, y: 100 },
        orientation: 'vertical' as const,
      }

      const intersection = findOrthogonalIntersection(segH, segV, 8)
      expect(intersection).toEqual({ x: 50, y: 50 })
    })

    it('renvoie null si deux segments sont parallèles', () => {
      const segH1 = {
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 },
        orientation: 'horizontal' as const,
      }
      const segH2 = {
        start: { x: 0, y: 60 },
        end: { x: 100, y: 60 },
        orientation: 'horizontal' as const,
      }

      expect(findOrthogonalIntersection(segH1, segH2)).toBeNull()
    })

    it('renvoie null si les segments ne se croisent pas', () => {
      const segH = {
        start: { x: 0, y: 50 },
        end: { x: 40, y: 50 },
        orientation: 'horizontal' as const,
      }
      const segV = {
        start: { x: 50, y: 0 },
        end: { x: 50, y: 100 },
        orientation: 'vertical' as const,
      }

      expect(findOrthogonalIntersection(segH, segV)).toBeNull()
    })
  })

  describe('computeEdgeCrossovers', () => {
    const edgeA = {
      id: 'edgeA',
      path: 'M 0 50 L 100 50',
      zIndex: 1,
    }
    const edgeB = {
      id: 'edgeB',
      path: 'M 50 0 L 50 100',
      zIndex: 2,
    }

    it('attribue le saut à l arête avec le z-index supérieur (INV-2)', () => {
      const crossovers = computeEdgeCrossovers([edgeA, edgeB])
      const jumpsA = crossovers.get('edgeA')
      const jumpsB = crossovers.get('edgeB')

      expect(jumpsA).toHaveLength(0)
      expect(jumpsB).toHaveLength(1)
      expect(jumpsB![0]).toMatchObject({
        x: 50,
        y: 50,
        orientation: 'vertical',
      })
    })

    it('inverse le saut au profit de l arête active lors du survol (INV-4)', () => {
      // edgeA est survolé (activeEdgeId = 'edgeA')
      const crossovers = computeEdgeCrossovers([edgeA, edgeB], 'edgeA')
      const jumpsA = crossovers.get('edgeA')
      const jumpsB = crossovers.get('edgeB')

      expect(jumpsA).toHaveLength(1)
      expect(jumpsB).toHaveLength(0)
      expect(jumpsA![0]).toMatchObject({
        x: 50,
        y: 50,
        orientation: 'horizontal',
      })
    })
  })

  describe('applyLineJumpsToPath', () => {
    it('insère un arc de pontet régulier sur un segment horizontal gauche -> droite (INV-3)', () => {
      const initialPath = 'M 0 50 L 100 50'
      const jumps = [
        {
          x: 50,
          y: 50,
          segmentIndex: 0,
          orientation: 'horizontal' as const,
          direction: 'positive' as const,
        },
      ]

      const result = applyLineJumpsToPath(initialPath, jumps, DEFAULT_LINE_JUMP_RADIUS)
      expect(result).toBe('M 0 50 L 44 50 A 6 6 0 0 1 56 50 L 100 50')
    })

    it('insère un arc de pontet régulier sur un segment horizontal droite -> gauche (INV-3)', () => {
      const initialPath = 'M 100 50 L 0 50'
      const jumps = [
        {
          x: 50,
          y: 50,
          segmentIndex: 0,
          orientation: 'horizontal' as const,
          direction: 'negative' as const,
        },
      ]

      const result = applyLineJumpsToPath(initialPath, jumps, DEFAULT_LINE_JUMP_RADIUS)
      expect(result).toBe('M 100 50 L 56 50 A 6 6 0 0 0 44 50 L 0 50')
    })

    it('insère un arc de pontet régulier sur un segment vertical haut -> bas (INV-3)', () => {
      const initialPath = 'M 50 0 L 50 100'
      const jumps = [
        {
          x: 50,
          y: 50,
          segmentIndex: 0,
          orientation: 'vertical' as const,
          direction: 'positive' as const,
        },
      ]

      const result = applyLineJumpsToPath(initialPath, jumps, DEFAULT_LINE_JUMP_RADIUS)
      expect(result).toBe('M 50 0 L 50 44 A 6 6 0 0 1 50 56 L 50 100')
    })

    it('gère plusieurs pontets ordonnés séquentiellement sur le même segment', () => {
      const initialPath = 'M 0 50 L 200 50'
      const jumps = [
        {
          x: 150,
          y: 50,
          segmentIndex: 0,
          orientation: 'horizontal' as const,
          direction: 'positive' as const,
        },
        {
          x: 50,
          y: 50,
          segmentIndex: 0,
          orientation: 'horizontal' as const,
          direction: 'positive' as const,
        },
      ]

      const result = applyLineJumpsToPath(initialPath, jumps, 6)
      expect(result).toBe(
        'M 0 50 L 44 50 A 6 6 0 0 1 56 50 L 144 50 A 6 6 0 0 1 156 50 L 200 50',
      )
    })

    it('retourne le chemin inchangé en l absence de pontets', () => {
      const initialPath = 'M 0 50 L 100 50'
      expect(applyLineJumpsToPath(initialPath, [])).toBe(initialPath)
    })
  })

  describe('computeAstEdgeCrossovers', () => {
    it('calcule les pontets pour deux connecteurs orthogonaux de l AST qui se croisent', () => {
      const ast = {
        shapes: [
          { id: 'leftNode', type: 'rectangle', label: 'Left', desc: null },
          { id: 'rightNode', type: 'rectangle', label: 'Right', desc: null },
          { id: 'topNode', type: 'rectangle', label: 'Top', desc: null },
          { id: 'bottomNode', type: 'rectangle', label: 'Bottom', desc: null },
        ],
        connectors: [
          { source: 'leftNode', target: 'rightNode', label: null, desc: null },
          { source: 'topNode', target: 'bottomNode', label: null, desc: null },
        ],
        layout: {
          leftNode: { x: 0, y: 200 },
          rightNode: { x: 400, y: 200 },
          topNode: { x: 200, y: 0 },
          bottomNode: { x: 200, y: 400 },
        },
        edgeLayout: {},
      } as any

      const nodes = [
        { id: 'leftNode', type: 'rectangle', position: { x: 0, y: 200 }, data: {} },
        { id: 'rightNode', type: 'rectangle', position: { x: 400, y: 200 }, data: {} },
        { id: 'topNode', type: 'rectangle', position: { x: 200, y: 0 }, data: {} },
        { id: 'bottomNode', type: 'rectangle', position: { x: 200, y: 400 }, data: {} },
      ] as any

      const distribution = {
        nodeHandles: new Map(),
        nodeScale: new Map(),
        edgeAssignments: new Map([
          [
            'leftNode->rightNode',
            {
              sourceHandle: 'right',
              targetHandle: 'left',
              sourceSide: 'right' as const,
              targetSide: 'left' as const,
            },
          ],
          [
            'topNode->bottomNode',
            {
              sourceHandle: 'bottom',
              targetHandle: 'top',
              sourceSide: 'bottom' as const,
              targetSide: 'top' as const,
            },
          ],
        ]),
      }

      const crossovers = computeAstEdgeCrossovers(ast, nodes, distribution)
      const jumpsH = crossovers.get('leftNode->rightNode') ?? []
      const jumpsV = crossovers.get('topNode->bottomNode') ?? []

      // Le deuxième connecteur (topNode->bottomNode) a un zIndex de 2 vs 1, donc il reçoit le saut
      expect(jumpsH).toHaveLength(0)
      expect(jumpsV).toHaveLength(1)
      expect(jumpsV[0]).toMatchObject({
        orientation: 'vertical',
      })
    })
  })
})

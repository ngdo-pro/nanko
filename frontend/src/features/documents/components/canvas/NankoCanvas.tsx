import React, { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Panel,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodeDrag,
} from '@xyflow/react'

import { RectangleNode } from './nodes/RectangleNode'
import { CircleNode } from './nodes/CircleNode'
import { TextNode } from './nodes/TextNode'
import { NankoEdge } from './edges/NankoEdge'
import { CanvasControls } from './CanvasControls'
import { calculateDagreLayout } from './utils/dagreLayout'
import type { NankoAst } from '@/features/documents'

const NODE_TYPES = {
  rectangle: RectangleNode,
  circle: CircleNode,
  text: TextNode,
}

const EDGE_TYPES = {
  nanko: NankoEdge,
}

interface NankoCanvasProps {
  ast: NankoAst
  syntaxError?: string | null
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void
  onAutoLayoutApplied?: (layout: Record<string, { x: number; y: number }>) => void
}

function buildNodesFromAst(ast: NankoAst): Node[] {
  const layoutDict = (ast?.layout ?? {}) as Record<string, { x: number; y: number }>

  const rawNodes: Node[] = (ast?.shapes ?? []).map((shape) => {
    const pos = layoutDict[shape.id]
    return {
      id: shape.id,
      type: shape.type,
      data: {
        label: shape.label,
        nodeId: shape.id,
        shapeType: shape.type,
      },
      position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
    }
  })

  // Si des nœuds n'ont pas de coordonnées dans layout, on utilise dagre pour les placer
  const edgesForLayout: Edge[] = (ast?.connectors ?? []).map((c) => ({
    id: `${c.source}->${c.target}`,
    source: c.source,
    target: c.target,
  }))

  const missingLayout = rawNodes.some((n) => !layoutDict[n.id])
  if (missingLayout && rawNodes.length > 0) {
    return calculateDagreLayout(rawNodes, edgesForLayout)
  }

  return rawNodes
}

function buildEdgesFromAst(ast: NankoAst, colorMode: 'dark' | 'light'): Edge[] {
  return (ast?.connectors ?? []).map((connector) => ({
    id: `${connector.source}->${connector.target}`,
    source: connector.source,
    target: connector.target,
    type: 'nanko',
    label: connector.label ?? undefined,
    data: { label: connector.label },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: colorMode === 'dark' ? '#5EEAD4' : '#1C382E',
    },
  }))
}

const NankoCanvasInner: React.FC<NankoCanvasProps> = ({
  ast,
  syntaxError,
  onNodePositionChange,
  onAutoLayoutApplied,
}) => {
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false)
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')

  // Observer le thème actif
  useEffect(() => {
    const updateTheme = () => {
      const currentTheme = document.documentElement?.getAttribute('data-theme')
      if (currentTheme === 'light') {
        setColorMode('light')
      } else if (currentTheme === 'dark') {
        setColorMode('dark')
      } else if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setColorMode(prefersDark ? 'dark' : 'light')
      } else {
        setColorMode('dark')
      }
    }

    updateTheme()
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      const observer = new MutationObserver(updateTheme)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      return () => observer.disconnect()
    }
  }, [])

  // Conserver le dernier AST valide si une erreur de syntaxe survient
  const [lastValidAst, setLastValidAst] = useState<NankoAst>(ast)
  const [prevAst, setPrevAst] = useState<NankoAst>(ast)
  const [prevColorMode, setPrevColorMode] = useState<'dark' | 'light'>(colorMode)

  const effectiveAst = syntaxError ? lastValidAst : ast

  const [nodes, setNodes] = useState<Node[]>(() => buildNodesFromAst(effectiveAst))
  const [edges, setEdges] = useState<Edge[]>(() => buildEdgesFromAst(effectiveAst, colorMode))

  if (!syntaxError && ast !== lastValidAst) {
    setLastValidAst(ast)
  }

  if (effectiveAst !== prevAst || colorMode !== prevColorMode) {
    setPrevAst(effectiveAst)
    setPrevColorMode(colorMode)
    setNodes(buildNodesFromAst(effectiveAst))
    setEdges(buildEdgesFromAst(effectiveAst, colorMode))
  }

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  // Déplacement terminé : synchroniser la position vers le code source
  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      onNodePositionChange?.(node.id, node.position)
    },
    [onNodePositionChange],
  )

  // Action d'auto-layout
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = calculateDagreLayout(nodes, edges)
    setNodes(layoutedNodes)

    const newPositions: Record<string, { x: number; y: number }> = {}
    for (const n of layoutedNodes) {
      newPositions[n.id] = { x: n.position.x, y: n.position.y }
    }

    onAutoLayoutApplied?.(newPositions)
  }, [nodes, edges, onAutoLayoutApplied])

  return (
    <div className="nanko-canvas-container" data-qa="nanko-canvas">
      {syntaxError && (
        <div className="canvas-syntax-pause-badge" data-qa="canvas-syntax-pause-badge">
          <span className="pause-dot" />
          <span>Syntaxe en cours d'édition - Canvas en pause</span>
        </div>
      )}

      {nodes.length === 0 && !syntaxError && (
        <div className="canvas-empty-state" data-qa="canvas-empty-state">
          <p className="canvas-empty-title">Aucun élément graphique</p>
          <span className="canvas-empty-subtitle">
            Basculez en mode <strong>Split</strong> ou <strong>Code</strong> pour ajouter des formes (ex: <code>rectangle app &quot;Web App&quot;</code>).
          </span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        colorMode={colorMode}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={3}
        defaultEdgeOptions={{ type: 'nanko' }}
        proOptions={{ hideAttribution: true }}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          backgroundColor: colorMode === 'dark' ? '#011C25' : '#FFFFFF',
        }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={26}
          lineWidth={1}
          color={colorMode === 'dark' ? 'rgba(94, 234, 212, 0.12)' : 'rgba(28, 56, 46, 0.08)'}
          bgColor={colorMode === 'dark' ? '#011C25' : '#FFFFFF'}
        />

        <Panel position="bottom-left" style={{ margin: 0 }}>
          <CanvasControls
            onAutoLayout={handleAutoLayout}
            showMiniMap={showMiniMap}
            onToggleMiniMap={() => setShowMiniMap((prev) => !prev)}
          />
        </Panel>

        {showMiniMap && (
          <MiniMap
            position="bottom-right"
            className="nanko-minimap"
            nodeStrokeWidth={2}
            maskColor={colorMode === 'dark' ? 'rgba(4, 20, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
        )}
      </ReactFlow>
    </div>
  )
}

export const NankoCanvas: React.FC<NankoCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <NankoCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

import React, { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
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
  useReactFlow,
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
import { RadialMenu } from './radial/RadialMenu'
import styles from './NankoCanvas.module.css'
import { calculateDagreLayout } from './utils/dagreLayout'
import type { ShapePrimitiveType } from './utils/insertShapeToSource'
import type { NankoAst } from '@/features/documents'

const NODE_TYPES = {
  rectangle: RectangleNode,
  circle: CircleNode,
  text: TextNode,
}

const EDGE_TYPES = {
  nanko: NankoEdge,
}

export interface NankoCanvasProps {
  ast: NankoAst
  syntaxError?: string | null
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void
  onAutoLayoutApplied?: (layout: Record<string, { x: number; y: number }>) => void
  onCreateShape?: (shapeType: ShapePrimitiveType, position: { x: number; y: number }) => void
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
        desc: shape.desc,
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
    data: { label: connector.label, desc: connector.desc },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: colorMode === 'dark' ? '#5EEAD4' : '#1C382E',
    },
  }))
}

function isInputFocused(): boolean {
  if (typeof document === 'undefined') return false
  const activeEl = document.activeElement
  if (!activeEl) return false
  const tag = activeEl.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || activeEl.getAttribute('contenteditable') === 'true') {
    return true
  }
  if (activeEl.closest('.monaco-editor') || activeEl.closest('.monaco-diff-editor')) {
    return true
  }
  return false
}

interface RadialMenuState {
  x: number
  y: number
  clientX: number
  clientY: number
}

const NankoCanvasInner: React.FC<NankoCanvasProps> = ({
  ast,
  syntaxError,
  onNodePositionChange,
  onAutoLayoutApplied,
  onCreateShape,
}) => {
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false)
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')
  const [radialMenu, setRadialMenu] = useState<RadialMenuState | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const isMouseOverCanvasRef = useRef<boolean>(false)
  const latestMouseRef = useRef<{ clientX: number; clientY: number; inside: boolean } | null>(null)
  const hoveredSectorRef = useRef<ShapePrimitiveType | null>(null)

  const { screenToFlowPosition } = useReactFlow()

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

  // Sélection d'un type dans la roue radiale
  const handleSelectRadialShape = useCallback(
    (shapeType: ShapePrimitiveType) => {
      if (!radialMenu) return
      const flowPos = screenToFlowPosition({ x: radialMenu.clientX, y: radialMenu.clientY })
      onCreateShape?.(shapeType, flowPos)
      setRadialMenu(null)
    },
    [radialMenu, screenToFlowPosition, onCreateShape],
  )

  // Raccourci direct clavier (R, C, T)
  const handleDirectShortcut = useCallback(
    (shapeType: ShapePrimitiveType) => {
      let clientPos: { x: number; y: number }
      if (latestMouseRef.current?.inside && containerRef.current) {
        clientPos = { x: latestMouseRef.current.clientX, y: latestMouseRef.current.clientY }
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        clientPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      } else {
        clientPos = { x: 200, y: 200 }
      }
      const flowPos = screenToFlowPosition(clientPos)
      onCreateShape?.(shapeType, flowPos)
    },
    [screenToFlowPosition, onCreateShape],
  )

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return

      // Roue radiale : Maintien de la touche A ou Tab
      if ((e.key === 'a' || e.key === 'A' || e.key === 'Tab') && !e.repeat) {
        if (!isMouseOverCanvasRef.current && !containerRef.current) return

        e.preventDefault()

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const clientX = latestMouseRef.current?.inside
          ? latestMouseRef.current.clientX
          : rect.left + rect.width / 2
        const clientY = latestMouseRef.current?.inside
          ? latestMouseRef.current.clientY
          : rect.top + rect.height / 2

        const relativeX = clientX - rect.left
        const relativeY = clientY - rect.top
        const clampedX = Math.max(95, Math.min(rect.width - 95, relativeX))
        const clampedY = Math.max(95, Math.min(rect.height - 95, relativeY))

        setRadialMenu({
          x: clampedX,
          y: clampedY,
          clientX,
          clientY,
        })
        return
      }

      // Raccourcis directs de création : R, C
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isMouseOverCanvasRef.current) {
          e.preventDefault()
          handleDirectShortcut('rectangle')
          return
        }
      }

      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isMouseOverCanvasRef.current) {
          e.preventDefault()
          handleDirectShortcut('circle')
          return
        }
      }

      // Fermeture par Échap
      if (e.key === 'Escape') {
        hoveredSectorRef.current = null
        setRadialMenu(null)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'Tab') {
        const shapeToCreate = hoveredSectorRef.current
        hoveredSectorRef.current = null

        setRadialMenu((currentMenu) => {
          if (currentMenu && shapeToCreate) {
            const clientPos = latestMouseRef.current?.inside
              ? { x: latestMouseRef.current.clientX, y: latestMouseRef.current.clientY }
              : { x: currentMenu.clientX, y: currentMenu.clientY }
            const flowPos = screenToFlowPosition(clientPos)
            onCreateShape?.(shapeToCreate, flowPos)
          }
          return null
        })
      }
    }

    const handleWindowBlur = () => {
      hoveredSectorRef.current = null
      setRadialMenu(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [handleDirectShortcut, screenToFlowPosition, onCreateShape])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    isMouseOverCanvasRef.current = true
    latestMouseRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      inside: true,
    }
  }

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    isMouseOverCanvasRef.current = true
    latestMouseRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      inside: true,
    }
  }

  const handlePointerLeave = () => {
    isMouseOverCanvasRef.current = false
    if (latestMouseRef.current) {
      latestMouseRef.current.inside = false
    }
  }

  return (
    <div
      ref={containerRef}
      className={clsx(styles.nankoCanvasContainer, 'nanko-canvas-container')}
      data-qa="nanko-canvas"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {syntaxError && (
        <div className={clsx(styles.canvasSyntaxPauseBadge, 'canvas-syntax-pause-badge')} data-qa="canvas-syntax-pause-badge">
          <span className={clsx(styles.pauseDot, 'pause-dot')} />
          <span>Syntaxe en cours d'édition - Canvas en pause</span>
        </div>
      )}

      {nodes.length === 0 && !syntaxError && (
        <div className={clsx(styles.canvasEmptyState, 'canvas-empty-state')} data-qa="canvas-empty-state">
          <p className={clsx(styles.canvasEmptyTitle, 'canvas-empty-title')}>Aucun élément graphique</p>
          <span className={clsx(styles.canvasEmptySubtitle, 'canvas-empty-subtitle')}>
            Maintenez la touche <strong>A</strong> ou <strong>Tab</strong> pour ouvrir la roue d'outils, ou utilisez les touches <strong>R</strong>, <strong>C</strong>.
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
            className={clsx(styles.nankoMinimap, 'nanko-minimap')}
            nodeStrokeWidth={2}
            maskColor={colorMode === 'dark' ? 'rgba(4, 20, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
        )}
      </ReactFlow>

      {radialMenu && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          onSelect={handleSelectRadialShape}
          onHoverSector={(sector) => {
            hoveredSectorRef.current = sector
          }}
          onClose={() => {
            hoveredSectorRef.current = null
            setRadialMenu(null)
          }}
        />
      )}
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

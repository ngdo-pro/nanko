import {
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  Panel,
  PanOnScrollMode,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useRef, useState } from "react";
import {
  type Annotation,
  createAnnotation,
  createElement,
  createRelation,
  deleteAnnotation,
  deleteElement,
  deleteRelation,
  type Graph,
  type GraphElement,
  type GraphRelation,
  updateAnnotation,
  updateElement,
  updateRelation,
  upsertElementPosition,
} from "../api";
import { AnnotationComposer } from "../components/AnnotationComposer";
import { ElementPanel } from "../components/ElementPanel";
import { RelationPanel } from "../components/RelationPanel";
import { useAnnotations } from "../hooks/useAnnotations";
import { AnnotationNode } from "./AnnotationNode";
import { ElementNode } from "./ElementNode";
import { RelationEdge } from "./RelationEdge";
import { fallbackPosition, toFlowGraph, type ElementNode as ElementNodeType, type Level, type RelationEdge as RelationEdgeType } from "./toFlowGraph";
import { toAnnotationNodes, type AnnotationNode as AnnotationNodeType } from "./toAnnotationNodes";

// Defined outside the component: React Flow warns and re-renders every node/edge
// if nodeTypes/edgeTypes are recreated on each render.
const NODE_TYPES: NodeTypes = { element: ElementNode, annotation: AnnotationNode };
const EDGE_TYPES: EdgeTypes = { relation: RelationEdge };

const CREATE_BUTTON_STYLE = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text-h)",
  fontFamily: "inherit",
  fontSize: "13px",
  cursor: "pointer",
};

type Selection = { kind: "element"; id: string } | { kind: "relation"; id: string };

type ComposerState =
  | { mode: "create"; flowX: number; flowY: number; screenX: number; screenY: number }
  | {
      mode: "edit";
      annotationId: string;
      screenX: number;
      screenY: number;
      initialAuthorName: string;
      initialBody: string;
      elementId: string | null;
    };

function emptyLevelMessage(level: Level): string {
  if (level.kind === "system") return "This project has no systems yet.";
  if (level.kind === "container") return "This system has no containers yet.";
  return "This container has no components yet.";
}

function newElementName(level: Level): string {
  if (level.kind === "system") return "New system";
  if (level.kind === "container") return "New container";
  return "New component";
}

export function CanvasGraph({
  projectId,
  graph,
  level,
  milestoneId,
  onNodeDoubleClick,
  readOnly = false,
  dataQa = "canvas-graph",
}: {
  projectId: string;
  graph: Graph;
  level: Level;
  milestoneId: string;
  // Drill-down navigation — omitted entirely in read-only contexts (e.g.
  // milestone comparison), which don't support navigating levels.
  onNodeDoubleClick?: (elementId: string) => void;
  // Disables every mutation (create/edit/delete/drag/connect) and selection —
  // used for milestone comparison, where two milestones are shown at once and
  // there is no single "active" milestone a panel edit could target.
  readOnly?: boolean;
  // Distinguishes multiple CanvasGraph instances mounted at once (e.g. the
  // two panes of a side-by-side comparison) for tests/tooling.
  dataQa?: string;
}) {
  const { nodes: initialNodes, edges: initialEdges } = toFlowGraph(graph, level);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [annotationNodes, setAnnotationNodes] = useState<AnnotationNodeType[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<ElementNodeType | AnnotationNodeType, RelationEdgeType | Edge> | null>(null);

  // Sticky notes are board metadata, not part of the resolved graph — never
  // diffed, kept across milestones. Disabled entirely in read-only contexts
  // (milestone comparison shows two milestones at once — there is no single
  // diagram scope a note would unambiguously belong to).
  const [annotationsState] = useAnnotations(readOnly ? undefined : projectId, level.parentId);

  useEffect(() => {
    if (annotationsState.status === "loaded") {
      setAnnotationNodes(toAnnotationNodes(annotationsState.annotations));
    }
  }, [annotationsState]);

  // Both derived from `nodes`/`edges` (the single source of truth kept up to
  // date by every handler below) rather than the `graph` prop, so a
  // just-created or just-renamed item's panel never shows stale data on reselect.
  const selectedNode = selection?.kind === "element" ? (nodes.find((node) => node.id === selection.id) ?? null) : null;
  const selectedEdge = selection?.kind === "relation" ? (edges.find((edge) => edge.id === selection.id) ?? null) : null;

  function handleSaveComposer(authorName: string, body: string) {
    if (!composer) return;

    if (composer.mode === "create") {
      const { flowX, flowY } = composer;
      createAnnotation(projectId, level.parentId, flowX, flowY, authorName, body)
        .then((res) => res.json())
        .then((created: Annotation) => {
          setAnnotationNodes((nds) => [...nds, ...toAnnotationNodes([created])]);
        })
        .catch((err) => console.error("Failed to create annotation", err));
    } else {
      const { annotationId, elementId } = composer;
      const position = annotationNodes.find((n) => n.id === annotationId)?.position ?? { x: 0, y: 0 };
      updateAnnotation(annotationId, authorName, body, position.x, position.y, elementId, null)
        .then((res) => res.json())
        .then((updated: Annotation) => {
          const [updatedNode] = toAnnotationNodes([updated]);
          setAnnotationNodes((nds) => nds.map((n) => (n.id === annotationId ? updatedNode : n)));
        })
        .catch((err) => console.error(`Failed to update annotation ${annotationId}`, err));
    }

    setComposer(null);
  }

  function handleDeleteComposerAnnotation() {
    if (!composer || composer.mode !== "edit") return;
    const { annotationId } = composer;

    deleteAnnotation(annotationId).catch((err) => console.error(`Failed to delete annotation ${annotationId}`, err));
    setAnnotationNodes((nds) => nds.filter((n) => n.id !== annotationId));
    setComposer(null);
  }

  function handleUnlinkComposerAnnotation() {
    if (!composer || composer.mode !== "edit") return;
    const { annotationId } = composer;
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current) return;

    updateAnnotation(annotationId, current.data.authorName, current.data.body, current.position.x, current.position.y, null, null)
      .then((res) => res.json())
      .then((updated: Annotation) => {
        const [updatedNode] = toAnnotationNodes([updated]);
        setAnnotationNodes((nds) => nds.map((n) => (n.id === annotationId ? updatedNode : n)));
      })
      .catch((err) => console.error(`Failed to unlink annotation ${annotationId}`, err));

    setComposer((state) => (state?.mode === "edit" ? { ...state, elementId: null } : state));
  }

  function handleLinkAnnotationToElement(annotationId: string, elementId: string) {
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current) return;

    updateAnnotation(annotationId, current.data.authorName, current.data.body, current.position.x, current.position.y, elementId, null)
      .then((res) => res.json())
      .then((updated: Annotation) => {
        const [updatedNode] = toAnnotationNodes([updated]);
        setAnnotationNodes((nds) => nds.map((n) => (n.id === annotationId ? updatedNode : n)));
      })
      .catch((err) => console.error(`Failed to link annotation ${annotationId} to element ${elementId}`, err));
  }

  function handleCommitInlineEdit(annotationId: string, newBody: string) {
    setEditingAnnotationId(null);
    const trimmed = newBody.trim();
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current || trimmed === "" || trimmed === current.data.body) return;

    updateAnnotation(
      annotationId,
      current.data.authorName,
      trimmed,
      current.position.x,
      current.position.y,
      current.data.elementId,
      current.data.relationId,
    )
      .then((res) => res.json())
      .then((updated: Annotation) => {
        const [updatedNode] = toAnnotationNodes([updated]);
        setAnnotationNodes((nds) => nds.map((n) => (n.id === annotationId ? updatedNode : n)));
      })
      .catch((err) => console.error(`Failed to update annotation ${annotationId}`, err));
  }

  function handleCreate() {
    const name = newElementName(level);

    createElement(projectId, milestoneId, level.kind, level.parentId, name)
      .then((res) => res.json())
      .then((created: GraphElement) => {
        const position = fallbackPosition(nodes.length);
        upsertElementPosition(created.id, milestoneId, position.x, position.y).catch((err) => {
          console.error(`Failed to save position for element ${created.id}`, err);
        });

        // A newly created node's fallback grid slot can land outside the
        // current viewport (fitView only runs on mount) — pan it into view.
        reactFlowInstanceRef.current?.setCenter(position.x + 110, position.y + 40, { zoom: 1, duration: 300 });

        setNodes((nds) => [
          ...nds,
          {
            id: created.id,
            type: "element",
            position,
            data: {
              label: created.name,
              description: created.description,
              technology: created.technology,
              isExternal: created.is_external,
              archetype: created.archetype,
            },
          },
        ]);
        setSelection({ kind: "element", id: created.id });
      })
      .catch((err) => console.error("Failed to create element", err));
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;

    // A connection dragged out of a post-it's handle links it to the target
    // element (the arrow) rather than creating a relation between two elements.
    if (annotationNodes.some((n) => n.id === connection.source)) {
      handleLinkAnnotationToElement(connection.source, connection.target);
      return;
    }

    createRelation(projectId, milestoneId, connection.source, connection.target)
      .then((res) => res.json())
      .then((created: GraphRelation) => {
        setEdges((eds) => [
          ...eds,
          {
            id: created.id,
            type: "relation",
            source: created.source_element_id,
            target: created.target_element_id,
            data: {
              label: created.label,
              technology: created.technology,
              status: created.status === "derived" ? "derived" : "declared",
              isUnrealized: false,
            },
          },
        ]);
        setSelection({ kind: "relation", id: created.id });
      })
      .catch((err) => console.error("Failed to create relation", err));
  }

  // Editing-related callbacks are injected here, at render time, rather than
  // stored in `annotationNodes` itself — keeps that state a plain mirror of
  // the API shape (what onNodesChange reads/writes back after a drag).
  const annotationNodesForRender: AnnotationNodeType[] = annotationNodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isEditing: node.id === editingAnnotationId,
      onCommitEdit: (body: string) => handleCommitInlineEdit(node.id, body),
      onCancelEdit: () => setEditingAnnotationId(null),
    },
  }));

  // A dashed arrow per linked note — decorative only (not part of `edges`
  // state, never selectable, never a real relation).
  const linkEdges: Edge[] = annotationNodes
    .filter((node) => node.data.elementId !== null)
    .map((node) => ({
      id: `annotation-link-${node.id}`,
      source: node.id,
      target: node.data.elementId as string,
      type: "straight",
      selectable: false,
      style: { stroke: "var(--note-border)", strokeDasharray: "4 4" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--note-border)" },
    }));

  return (
    <div data-qa={dataQa} style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <div style={{ flex: 1, position: "relative" }}>
        {initialNodes.length === 0 && (
          <p
            data-qa="canvas-empty-level"
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", margin: 0, zIndex: 1 }}
          >
            {emptyLevelMessage(level)}
          </p>
        )}
        <ReactFlow
          nodes={[...nodes, ...annotationNodesForRender]}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          onNodesChange={(changes) => {
            const merged = applyNodeChanges(changes, [...nodes, ...annotationNodes]);
            setNodes(merged.filter((node) => node.type === "element"));
            setAnnotationNodes(merged.filter((node) => node.type === "annotation"));
          }}
          onNodeDragStop={
            readOnly
              ? undefined
              : (_event, node) => {
                  if (node.type === "annotation") {
                    const current = annotationNodes.find((n) => n.id === node.id);
                    if (!current) return;
                    updateAnnotation(
                      node.id,
                      current.data.authorName,
                      current.data.body,
                      node.position.x,
                      node.position.y,
                      current.data.elementId,
                      current.data.relationId,
                    ).catch((err) => {
                      console.error(`Failed to save position for annotation ${node.id}`, err);
                    });
                    return;
                  }

                  upsertElementPosition(node.id, milestoneId, node.position.x, node.position.y).catch((err) => {
                    console.error(`Failed to save position for element ${node.id}`, err);
                  });
                }
          }
          onNodeClick={
            readOnly
              ? undefined
              : (event, node) => {
                  if (node.type === "annotation") {
                    const current = annotationNodes.find((n) => n.id === node.id);
                    if (!current) return;
                    setComposer({
                      mode: "edit",
                      annotationId: node.id,
                      screenX: event.clientX,
                      screenY: event.clientY,
                      initialAuthorName: current.data.authorName,
                      initialBody: current.data.body,
                      elementId: current.data.elementId,
                    });
                    return;
                  }

                  setSelection({ kind: "element", id: node.id });
                }
          }
          onNodeDoubleClick={
            readOnly
              ? undefined
              : (_event, node) => {
                  if (node.type === "annotation") {
                    // Closes any composer a preceding click may have just opened
                    // (a real double-click fires click then dblclick) — the end
                    // state is inline editing, not both UIs open at once.
                    setEditingAnnotationId(node.id);
                    setComposer(null);
                    return;
                  }

                  if (node.type === "element") onNodeDoubleClick?.(node.id);
                }
          }
          onPaneContextMenu={
            readOnly
              ? undefined
              : (event) => {
                  event.preventDefault();
                  const mouseEvent = event as MouseEvent;
                  const flowPosition = reactFlowInstanceRef.current?.screenToFlowPosition({
                    x: mouseEvent.clientX,
                    y: mouseEvent.clientY,
                  });
                  if (!flowPosition) return;

                  setComposer({
                    mode: "create",
                    flowX: flowPosition.x,
                    flowY: flowPosition.y,
                    screenX: mouseEvent.clientX,
                    screenY: mouseEvent.clientY,
                  });
                }
          }
          onEdgeClick={
            readOnly
              ? undefined
              : (_event, edge) => {
                  // Synthetic annotation-link arrows are decorative (selectable: false already
                  // asks React Flow not to select them) — this is a belt-and-suspenders guard
                  // so a click never opens RelationPanel for an id that isn't a real relation.
                  if (edge.id.startsWith("annotation-link-")) return;
                  setSelection({ kind: "relation", id: edge.id });
                }
          }
          onConnect={readOnly ? undefined : handleConnect}
          onPaneClick={readOnly ? undefined : () => setSelection(null)}
          edges={[...edges, ...linkEdges]}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
          zoomOnPinch
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
        >
          <Background />
          <Controls />
          {!readOnly && (
            <Panel position="top-right">
              <button type="button" data-qa="create-element" onClick={handleCreate} style={CREATE_BUTTON_STYLE}>
                + {newElementName(level)}
              </button>
            </Panel>
          )}
        </ReactFlow>

        {composer && (
          <AnnotationComposer
            x={composer.screenX}
            y={composer.screenY}
            initialAuthorName={composer.mode === "edit" ? composer.initialAuthorName : undefined}
            initialBody={composer.mode === "edit" ? composer.initialBody : undefined}
            linkedElementLabel={
              composer.mode === "edit" && composer.elementId !== null
                ? (nodes.find((node) => node.id === composer.elementId)?.data.label ?? "an element")
                : null
            }
            onSave={handleSaveComposer}
            onDelete={composer.mode === "edit" ? handleDeleteComposerAnnotation : undefined}
            onUnlink={composer.mode === "edit" ? handleUnlinkComposerAnnotation : undefined}
            onClose={() => setComposer(null)}
          />
        )}
      </div>

      {!readOnly && selectedNode && (
        <ElementPanel
          key={selectedNode.id}
          element={{
            id: selectedNode.id,
            project_id: projectId,
            parent_id: level.parentId,
            kind: level.kind,
            is_external: selectedNode.data.isExternal,
            archetype: selectedNode.data.archetype,
            name: selectedNode.data.label,
            description: selectedNode.data.description,
            technology: selectedNode.data.technology,
          }}
          onSave={(name, description, technology, archetype) => {
            updateElement(selectedNode.id, milestoneId, name, description, technology, archetype).catch((err) => {
              console.error(`Failed to save element ${selectedNode.id}`, err);
            });
            setNodes((nds) =>
              nds.map((node) =>
                node.id === selectedNode.id ? { ...node, data: { ...node.data, label: name, description, technology, archetype } } : node,
              ),
            );
          }}
          onDelete={() => {
            deleteElement(selectedNode.id, milestoneId).catch((err) => {
              console.error(`Failed to delete element ${selectedNode.id}`, err);
            });
            setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
            setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {!readOnly && selectedEdge && (
        <RelationPanel
          key={selectedEdge.id}
          relation={{
            id: selectedEdge.id,
            source_element_id: selectedEdge.source,
            target_element_id: selectedEdge.target,
            status: selectedEdge.data?.status ?? "declared",
            label: selectedEdge.data?.label ?? null,
            technology: selectedEdge.data?.technology ?? null,
            realized_at_milestone_id: null,
          }}
          onSave={(label, technology) => {
            updateRelation(selectedEdge.id, milestoneId, label, technology).catch((err) => {
              console.error(`Failed to save relation ${selectedEdge.id}`, err);
            });
            setEdges((eds) =>
              eds.map((edge) =>
                edge.id === selectedEdge.id
                  ? {
                      ...edge,
                      data: { label, technology, status: edge.data?.status ?? "declared", isUnrealized: edge.data?.isUnrealized ?? false },
                    }
                  : edge,
              ),
            );
          }}
          onDelete={() => {
            deleteRelation(selectedEdge.id, milestoneId).catch((err) => {
              console.error(`Failed to delete relation ${selectedEdge.id}`, err);
            });
            setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}

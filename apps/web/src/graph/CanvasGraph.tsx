import {
  applyNodeChanges,
  Background,
  Controls,
  Panel,
  PanOnScrollMode,
  ReactFlow,
  type Connection,
  type EdgeTypes,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Annotation,
  type AnnotationLinkInput,
  createAnnotation,
  createElement,
  createRelation,
  deleteAnnotation,
  deleteElement,
  deleteRelation,
  type Graph,
  type GraphElement,
  type GraphRelation,
  type RelationHandle,
  updateAnnotation,
  updateElement,
  updateRelation,
  upsertElementPosition,
} from "../api";
import { AnnotationComposer } from "../components/AnnotationComposer";
import { ElementPanel } from "../components/ElementPanel";
import { RelationPanel } from "../components/RelationPanel";
import { useAnnotations } from "../hooks/useAnnotations";
import { AnnotationLinkEdge, type AnnotationLinkEdge as AnnotationLinkEdgeType } from "./AnnotationLinkEdge";
import { resolveAnnotationConnection, toAnnotationLinkEdges, toLinkPayload } from "./annotationLinks";
import { AnnotationNode } from "./AnnotationNode";
import { ElementNode } from "./ElementNode";
import { RelationAnchorNode } from "./RelationAnchorNode";
import { toRelationAnchorNodes, type RelationAnchorNode as RelationAnchorNodeType } from "./relationAnchors";
import { RelationEdge } from "./RelationEdge";
import {
  fallbackPosition,
  resolveRelationHandles,
  toFlowGraph,
  type ElementNode as ElementNodeType,
  type Level,
  type RelationEdge as RelationEdgeType,
} from "./toFlowGraph";
import { toAnnotationNodes, type AnnotationNode as AnnotationNodeType, type AnnotationNodeLink } from "./toAnnotationNodes";

// Defined outside the component: React Flow warns and re-renders every node/edge
// if nodeTypes/edgeTypes are recreated on each render.
const NODE_TYPES: NodeTypes = { element: ElementNode, annotation: AnnotationNode, relationAnchor: RelationAnchorNode };
const EDGE_TYPES: EdgeTypes = { relation: RelationEdge, annotationLink: AnnotationLinkEdge };

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
  const reactFlowInstanceRef = useRef<ReactFlowInstance<
    ElementNodeType | AnnotationNodeType | RelationAnchorNodeType,
    RelationEdgeType | AnnotationLinkEdgeType
  > | null>(null);

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
      // The composer is display+unlink only for links (creation stays
      // drag-only) — its save path never touches `links`, just carries the
      // note's current ones back unchanged, same convention as archetype/
      // relation handles elsewhere in this file.
      const { annotationId } = composer;
      const current = annotationNodes.find((n) => n.id === annotationId);
      const position = current?.position ?? { x: 0, y: 0 };
      updateAnnotation(annotationId, authorName, body, position.x, position.y, toLinkPayload(current?.data.links ?? []))
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

  // Shared by every write that only touches a note's link set (append one,
  // remove one by id) — full-replace semantics, same PATCH shape either way.
  function patchAnnotationLinks(annotationId: string, links: AnnotationLinkInput[]) {
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current) return;

    updateAnnotation(annotationId, current.data.authorName, current.data.body, current.position.x, current.position.y, links)
      .then((res) => res.json())
      .then((updated: Annotation) => {
        const [updatedNode] = toAnnotationNodes([updated]);
        setAnnotationNodes((nds) => nds.map((n) => (n.id === annotationId ? updatedNode : n)));
      })
      .catch((err) => console.error(`Failed to update links for annotation ${annotationId}`, err));
  }

  function handleAppendAnnotationLink(annotationId: string, link: AnnotationLinkInput) {
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current) return;
    patchAnnotationLinks(annotationId, [...toLinkPayload(current.data.links), link]);
  }

  function handleRemoveAnnotationLink(annotationId: string, linkId: string) {
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current) return;
    patchAnnotationLinks(
      annotationId,
      toLinkPayload(current.data.links.filter((l) => l.id !== linkId)),
    );
  }

  function handleCommitInlineEdit(annotationId: string, newBody: string) {
    setEditingAnnotationId(null);
    const trimmed = newBody.trim();
    const current = annotationNodes.find((n) => n.id === annotationId);
    if (!current || trimmed === "" || trimmed === current.data.body) return;

    updateAnnotation(annotationId, current.data.authorName, trimmed, current.position.x, current.position.y, toLinkPayload(current.data.links))
      .then((res) => res.json())
      .then((updated: Annotation) => {
        const [updatedNode] = toAnnotationNodes([updated]);
        setAnnotationNodes((nds) => nds.map((n) => (n.id === annotationId ? updatedNode : n)));
      })
      .catch((err) => console.error(`Failed to update annotation ${annotationId}`, err));
  }

  // Element name / relation label / target note's author — the composer
  // shows one label per link, resolved from whichever of nodes/edges/
  // annotationNodes the link's non-null target field points into.
  function annotationLinkLabel(link: AnnotationNodeLink): string {
    if (link.elementId !== null) return nodes.find((n) => n.id === link.elementId)?.data.label ?? "an element";
    if (link.relationId !== null) return edges.find((e) => e.id === link.relationId)?.data?.label ?? "a relation";
    if (link.targetAnnotationId !== null) {
      const target = annotationNodes.find((n) => n.id === link.targetAnnotationId);
      return target ? `note by ${target.data.authorName}` : "a note";
    }
    return "an unknown link";
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
    // (element, another note, or a relation via its synthetic anchor) rather
    // than creating a relation between two elements. Rejects a drag whose
    // target is a note but whose source isn't (notes only ever point
    // outward) and silently dedupes a re-dragged existing link.
    const resolution = resolveAnnotationConnection(connection, annotationNodes);
    if (resolution.kind === "reject" || resolution.kind === "noop") return;
    if (resolution.kind === "append") {
      handleAppendAnnotationLink(resolution.annotationId, resolution.link);
      return;
    }

    const sourceHandle = (connection.sourceHandle ?? null) as RelationHandle | null;
    const targetHandle = (connection.targetHandle ?? null) as RelationHandle | null;

    createRelation(projectId, milestoneId, connection.source, connection.target, sourceHandle, targetHandle)
      .then((res) => res.json())
      .then((created: GraphRelation) => {
        const resolvedHandles = resolveRelationHandles(created);

        setEdges((eds) => [
          ...eds,
          {
            id: created.id,
            type: "relation",
            source: created.source_element_id,
            target: created.target_element_id,
            sourceHandle: resolvedHandles.sourceHandle,
            targetHandle: resolvedHandles.targetHandle,
            data: {
              label: created.label,
              technology: created.technology,
              status: created.status === "derived" ? "derived" : "declared",
              isUnrealized: false,
              ...resolvedHandles,
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

  // A dashed arrow per link entry, fanning out from its note — decorative
  // only (not part of `edges` state, never selectable, never a real relation).
  const linkEdges: AnnotationLinkEdgeType[] = toAnnotationLinkEdges(annotationNodes);

  // One invisible synthetic node per relation, positioned at its midpoint, so
  // a note can drag-link to a relation (edges aren't valid drop targets).
  // Memoized (unlike annotationNodesForRender/linkEdges above) because xyflow
  // treats a new node object identity as unmeasured, holding it at
  // `visibility: hidden` — including for hit-testing — until a ResizeObserver
  // round-trip completes; recomputing a fresh array every render never lets
  // that round-trip land, so the anchor's connect handle silently never
  // becomes droppable. A stable reference across renders that don't change
  // `nodes`/`edges` lets the measurement stick.
  const relationAnchorNodes: RelationAnchorNodeType[] = useMemo(
    () => toRelationAnchorNodes(nodes, edges),
    [nodes, edges],
  );

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
          nodes={[...nodes, ...annotationNodesForRender, ...relationAnchorNodes]}
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
                  // A relation anchor is invisible/non-draggable, so this
                  // shouldn't fire for one — guarded anyway, defensively.
                  if (node.type === "relationAnchor") return;

                  if (node.type === "annotation") {
                    const current = annotationNodes.find((n) => n.id === node.id);
                    if (!current) return;
                    updateAnnotation(
                      node.id,
                      current.data.authorName,
                      current.data.body,
                      node.position.x,
                      node.position.y,
                      toLinkPayload(current.data.links),
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
                  if (node.type === "relationAnchor") return;

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
                  if (node.type === "relationAnchor") return;

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
            links={
              composer.mode === "edit"
                ? (annotationNodes.find((node) => node.id === composer.annotationId)?.data.links ?? []).map((link) => ({
                    label: annotationLinkLabel(link),
                    onUnlink: () => handleRemoveAnnotationLink(composer.annotationId, link.id),
                  }))
                : []
            }
            onSave={handleSaveComposer}
            onDelete={composer.mode === "edit" ? handleDeleteComposerAnnotation : undefined}
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
            source_handle: selectedEdge.data?.sourceHandle ?? null,
            target_handle: selectedEdge.data?.targetHandle ?? null,
          }}
          onSave={(label, technology, sourceHandle, targetHandle) => {
            updateRelation(selectedEdge.id, milestoneId, label, technology, sourceHandle, targetHandle).catch((err) => {
              console.error(`Failed to save relation ${selectedEdge.id}`, err);
            });
            setEdges((eds) =>
              eds.map((edge) =>
                edge.id === selectedEdge.id
                  ? {
                      ...edge,
                      sourceHandle: sourceHandle ?? edge.sourceHandle,
                      targetHandle: targetHandle ?? edge.targetHandle,
                      data: {
                        label,
                        technology,
                        status: edge.data?.status ?? "declared",
                        isUnrealized: edge.data?.isUnrealized ?? false,
                        sourceHandle: sourceHandle ?? edge.data?.sourceHandle ?? "bottom",
                        targetHandle: targetHandle ?? edge.data?.targetHandle ?? "top",
                      },
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

import type { Edge, Node } from "@xyflow/react";
import type { ElementArchetype, Graph, GraphRelation, RelationHandle } from "../api";

// Only ever set by the milestone-comparison overlay (graph/diff.ts) — absent
// everywhere else, so the normal single-milestone canvas is unaffected.
export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export type ElementNodeData = {
  label: string;
  description: string | null;
  technology: string | null;
  isExternal: boolean;
  archetype: ElementArchetype | null;
  diffStatus?: DiffStatus;
  // Only meaningful when diffStatus is "modified" — which of name/description/
  // technology changed. Not rendered on the node itself (DiffPanel's list is
  // where the detail belongs), carried here so DiffPanel can reuse the same
  // merged node list CompareScreen already builds instead of re-deriving it.
  changedFields?: string[];
};
export type ElementNode = Node<ElementNodeData, "element">;

export type RelationEdgeData = {
  label: string | null;
  technology: string | null;
  status: "derived" | "declared";
  isUnrealized: boolean;
  sourceHandle: RelationHandle;
  targetHandle: RelationHandle;
  diffStatus?: DiffStatus;
  changedFields?: string[];
};
export type RelationEdge = Edge<RelationEdgeData, "relation">;

// Existing relations predate the anchor feature and carry no handle in the
// database — default to the bottom/top pair every relation used to render
// with implicitly, so no existing diagram re-arranges visually on deploy.
export function resolveRelationHandles(relation: Pick<GraphRelation, "source_handle" | "target_handle">): {
  sourceHandle: RelationHandle;
  targetHandle: RelationHandle;
} {
  return {
    sourceHandle: relation.source_handle ?? "bottom",
    targetHandle: relation.target_handle ?? "top",
  };
}

// One drill-down level of the C1 → C2 → C3 hierarchy. `parentId` is both the
// `parent_id` elements at this level must have, and — for C2/C3 — the
// `scope_element_id` the graph was fetched with (the drilled-into element).
export type Level =
  | { kind: "system"; parentId: null }
  | { kind: "container"; parentId: string }
  | { kind: "component"; parentId: string };

export function levelFromParams(systemId?: string, containerId?: string): Level {
  if (containerId) return { kind: "component", parentId: containerId };
  if (systemId) return { kind: "container", parentId: systemId };
  return { kind: "system", parentId: null };
}

const WARNING_UNREALIZED_DECLARED_RELATION = "unrealized_declared_relation";

const GRID_COLUMNS = 4;
const GRID_SPACING_X = 260;
const GRID_SPACING_Y = 160;

export function fallbackPosition(index: number): { x: number; y: number } {
  return {
    x: (index % GRID_COLUMNS) * GRID_SPACING_X,
    y: Math.floor(index / GRID_COLUMNS) * GRID_SPACING_Y,
  };
}

export function toFlowGraph(graph: Graph, level: Level): { nodes: ElementNode[]; edges: RelationEdge[] } {
  const visibleElements = graph.elements.filter((element) => element.kind === level.kind && element.parent_id === level.parentId);
  const visibleIds = new Set(visibleElements.map((element) => element.id));
  const unrealizedRelationIds = new Set(
    graph.warnings
      .filter((warning) => warning.type === WARNING_UNREALIZED_DECLARED_RELATION && warning.subject_id !== null)
      .map((warning) => warning.subject_id),
  );

  const nodes: ElementNode[] = visibleElements.map((element, index) => ({
    id: element.id,
    type: "element",
    position: graph.positions[element.id] ?? fallbackPosition(index),
    data: {
      label: element.name,
      description: element.description,
      technology: element.technology,
      isExternal: element.is_external,
      archetype: element.archetype,
    },
  }));

  const edges: RelationEdge[] = graph.relations
    .filter((relation) => visibleIds.has(relation.source_element_id) && visibleIds.has(relation.target_element_id))
    .map((relation) => {
      const { sourceHandle, targetHandle } = resolveRelationHandles(relation);

      return {
        id: relation.id,
        type: "relation",
        source: relation.source_element_id,
        target: relation.target_element_id,
        sourceHandle,
        targetHandle,
        data: {
          label: relation.label,
          technology: relation.technology,
          status: relation.status === "derived" ? "derived" : "declared",
          isUnrealized: unrealizedRelationIds.has(relation.id),
          sourceHandle,
          targetHandle,
        },
      };
    });

  return { nodes, edges };
}

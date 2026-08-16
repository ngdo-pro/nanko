import type { Graph } from "../api";
import { fallbackPosition, resolveRelationHandles, type DiffStatus, type ElementNode, type Level, type RelationEdge } from "./toFlowGraph";

export type DiffEntry = { id: string; status: DiffStatus; changed_fields: string[] };
export type DiffResult = { elements: DiffEntry[]; relations: DiffEntry[] };

type Identified = { id: string };

function indexById<T extends Identified>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

// A `removed` item only exists in `fromGraph`; every other status (including
// `unchanged`, where both sides are identical) prefers `toGraph`, falling
// back to `fromGraph` only if `toGraph` is somehow missing it.
function pickVersion<T extends Identified>(status: DiffStatus, fromById: Map<string, T>, toById: Map<string, T>, id: string): T {
  const version = status === "removed" ? fromById.get(id) : (toById.get(id) ?? fromById.get(id));
  if (!version) throw new Error(`Diff references unknown id "${id}" — fromGraph/toGraph don't match the diff result.`);
  return version;
}

function positionKey(position: { x: number; y: number }): string {
  return `${position.x},${position.y}`;
}

// Assigns each node a position that doesn't collide with any other node's,
// real or fallback — a plain merge of two independently-positioned graphs
// otherwise regularly lands two unrelated nodes on the exact same spot (a
// real saved position coinciding with the deterministic fallback grid, or
// two never-positioned "added" nodes both falling back to the same slot).
// Overlay is read-only, so unlike the normal canvas there is no drag to fix
// this after the fact — it has to not happen in the first place.
function createPositionResolver() {
  const occupied = new Set<string>();
  let nextFallbackIndex = 0;

  function nextFreeFallback(): { x: number; y: number } {
    let candidate = fallbackPosition(nextFallbackIndex);
    while (occupied.has(positionKey(candidate))) {
      nextFallbackIndex++;
      candidate = fallbackPosition(nextFallbackIndex);
    }
    nextFallbackIndex++;
    return candidate;
  }

  return function resolvePosition(preferred: { x: number; y: number } | undefined): { x: number; y: number } {
    const position = preferred && !occupied.has(positionKey(preferred)) ? preferred : nextFreeFallback();
    occupied.add(positionKey(position));
    return position;
  };
}

// Merges two milestones' graphs into a single node/edge list for the overlay
// comparison view, tagging every node/edge with the diff status computed by
// the backend (GraphDiffer). Deliberately ignores `graph.warnings` (the
// "unrealized declared relation" styling) — in overlay mode the diff status
// is the one signal being shown, mixing in a second color/meaning would
// undercut the "read the diff at a glance" goal this view exists for.
export function toOverlayFlowGraph(fromGraph: Graph, toGraph: Graph, diff: DiffResult, level: Level): { nodes: ElementNode[]; edges: RelationEdge[] } {
  const fromElementsById = indexById(fromGraph.elements);
  const toElementsById = indexById(toGraph.elements);
  const elementDiffById = indexById(diff.elements);

  const visibleElementIds: string[] = [];
  const seenElementIds = new Set<string>();
  for (const element of [...toGraph.elements, ...fromGraph.elements]) {
    if (element.kind !== level.kind || element.parent_id !== level.parentId || seenElementIds.has(element.id)) continue;
    seenElementIds.add(element.id);
    visibleElementIds.push(element.id);
  }

  const resolvePosition = createPositionResolver();

  const nodes: ElementNode[] = visibleElementIds.map((id) => {
    const entry = elementDiffById.get(id);
    const status = entry?.status ?? "unchanged";
    const element = pickVersion(status, fromElementsById, toElementsById, id);
    const preferred = status === "removed" ? fromGraph.positions[id] : (toGraph.positions[id] ?? fromGraph.positions[id]);
    const position = resolvePosition(preferred);

    return {
      id,
      type: "element",
      position,
      data: {
        label: element.name,
        description: element.description,
        technology: element.technology,
        isExternal: element.is_external,
        archetype: element.archetype,
        diffStatus: status,
        changedFields: entry?.changed_fields ?? [],
      },
    };
  });

  const visibleElementIdSet = new Set(visibleElementIds);
  const fromRelationsById = indexById(fromGraph.relations);
  const toRelationsById = indexById(toGraph.relations);
  const relationDiffById = indexById(diff.relations);

  const visibleRelationIds: string[] = [];
  const seenRelationIds = new Set<string>();
  for (const relation of [...toGraph.relations, ...fromGraph.relations]) {
    if (seenRelationIds.has(relation.id)) continue;
    if (!visibleElementIdSet.has(relation.source_element_id) || !visibleElementIdSet.has(relation.target_element_id)) continue;
    seenRelationIds.add(relation.id);
    visibleRelationIds.push(relation.id);
  }

  const edges: RelationEdge[] = visibleRelationIds.map((id) => {
    const entry = relationDiffById.get(id);
    const status = entry?.status ?? "unchanged";
    const relation = pickVersion(status, fromRelationsById, toRelationsById, id);
    const { sourceHandle, targetHandle } = resolveRelationHandles(relation);

    return {
      id,
      type: "relation",
      source: relation.source_element_id,
      target: relation.target_element_id,
      sourceHandle,
      targetHandle,
      data: {
        label: relation.label,
        technology: relation.technology,
        status: relation.status === "derived" ? "derived" : "declared",
        isUnrealized: false,
        sourceHandle,
        targetHandle,
        diffStatus: status,
        changedFields: entry?.changed_fields ?? [],
      },
    };
  });

  return { nodes, edges };
}

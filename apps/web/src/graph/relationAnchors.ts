import type { Node } from "@xyflow/react";
import type { ElementNode, RelationEdge } from "./toFlowGraph";

export const RELATION_ANCHOR_PREFIX = "relation-anchor-";

export function relationAnchorId(relationId: string): string {
  return `${RELATION_ANCHOR_PREFIX}${relationId}`;
}

// null when the given node id isn't a relation-anchor id — used to both
// detect a relation-anchor drop target and recover the underlying relation id.
export function relationIdFromAnchorId(nodeId: string): string | null {
  return nodeId.startsWith(RELATION_ANCHOR_PREFIX) ? nodeId.slice(RELATION_ANCHOR_PREFIX.length) : null;
}

export type RelationAnchorNodeData = { relationId: string };
export type RelationAnchorNode = Node<RelationAnchorNodeData, "relationAnchor">;

// One invisible, non-draggable, non-selectable node per relation, letting a
// note drag-link to a relation (react-flow edges aren't drop targets, only
// nodes are). Positioned at the plain center-to-center midpoint of the
// relation's source/target element — an approximation of RelationEdge's own
// bezier-derived label point, which needs DOM/handle geometry not available
// at node-assembly time; close enough to serve as a drop target. Recomputed
// from the live element/relation node lists, so it tracks position drags
// exactly like every other derived node in CanvasGraph.
export function toRelationAnchorNodes(elementNodes: ElementNode[], relationEdges: RelationEdge[]): RelationAnchorNode[] {
  const positionById = new Map(elementNodes.map((node) => [node.id, node.position]));

  return relationEdges.flatMap((edge) => {
    const source = positionById.get(edge.source);
    const target = positionById.get(edge.target);
    if (!source || !target) return [];

    return [
      {
        id: relationAnchorId(edge.id),
        type: "relationAnchor" as const,
        position: { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 },
        // xyflow holds a node at `visibility: hidden` — which also takes it out of
        // hit-testing, so it can never receive a connection drop — until its first
        // ResizeObserver round-trip lands (see nodeHasDimensions in @xyflow/system).
        // Seeding initialWidth/initialHeight makes it "measured" synchronously on
        // the very first render instead of waiting on that async round-trip.
        initialWidth: 1,
        initialHeight: 1,
        draggable: false,
        selectable: false,
        data: { relationId: edge.id },
      },
    ];
  });
}

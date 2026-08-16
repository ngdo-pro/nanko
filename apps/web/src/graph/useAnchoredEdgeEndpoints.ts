import { useInternalNode } from "@xyflow/react";
import type { RelationHandle } from "../api";

function centerOf(node: ReturnType<typeof useInternalNode>): { x: number; y: number } | null {
  if (!node?.measured?.width || !node.measured.height) return null;
  return { x: node.internals.positionAbsolute.x + node.measured.width / 2, y: node.internals.positionAbsolute.y + node.measured.height / 2 };
}

// xyflow computes an edge's sourceX/Y from the handle's `Position` via a fixed per-side formula
// (Top -> the handle box's top-center, Bottom -> bottom-center, etc) — there's no "center" case,
// only for the in-progress connection line. A center-anchored handle is still assigned
// Position.Top for the drag/CSS side of things (see ElementNode/AnnotationNode), so the computed
// point lands at the *top* of that (invisible) handle, not the node's actual center — measured in
// e2e: for a 210x45 node it was off by ~10px, a third of the node's height. Shared by RelationEdge
// and the note-to-element decorative arrow, both of which can have a center-anchored end.
//
// useInternalNode (not useReactFlow().getNode, a plain non-reactive snapshot read) so the caller
// re-renders as soon as the node's measured size lands — without it, a center-anchored edge can
// render one frame with `measured` still undefined, catching xyflow's Position.Top-biased
// sourceX/Y before this hook ever gets to correct it.
export function useAnchoredEdgeEndpoints(
  source: string,
  target: string,
  sourceHandle: RelationHandle | null | undefined,
  targetHandle: RelationHandle | null | undefined,
  rawSourceX: number,
  rawSourceY: number,
  rawTargetX: number,
  rawTargetY: number,
): { sourceX: number; sourceY: number; targetX: number; targetY: number; isCenterAnchored: boolean } {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const sourceCenter = sourceHandle === "center" ? centerOf(sourceNode) : null;
  const targetCenter = targetHandle === "center" ? centerOf(targetNode) : null;

  return {
    sourceX: sourceCenter?.x ?? rawSourceX,
    sourceY: sourceCenter?.y ?? rawSourceY,
    targetX: targetCenter?.x ?? rawTargetX,
    targetY: targetCenter?.y ?? rawTargetY,
    isCenterAnchored: sourceHandle === "center" || targetHandle === "center",
  };
}

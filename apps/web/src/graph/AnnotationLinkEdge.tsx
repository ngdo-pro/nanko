import { BaseEdge, getBezierPath, getStraightPath, type Edge, type EdgeProps } from "@xyflow/react";
import { useAnchoredEdgeEndpoints } from "./useAnchoredEdgeEndpoints";
import type { RelationHandle } from "../api";

export type AnnotationLinkEdgeData = {
  sourceHandle: RelationHandle;
  targetHandle: RelationHandle;
};

export type AnnotationLinkEdge = Edge<AnnotationLinkEdgeData, "annotationLink">;

// The dashed arrow from a note to a target it's linked to — decorative only
// (not a real relation, never selectable). Curves like RelationEdge, except
// for the center-anchor case (see RelationEdge's own comment on why: no real
// side to bezier-curve away from), which stays straight — the same fix
// RelationEdge already needed for its raw sourceX/Y being wrong at a
// center-anchored end (see useAnchoredEdgeEndpoints).
export function AnnotationLinkEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<AnnotationLinkEdge>) {
  const {
    sourceX: effectiveSourceX,
    sourceY: effectiveSourceY,
    targetX: effectiveTargetX,
    targetY: effectiveTargetY,
    isCenterAnchored,
  } = useAnchoredEdgeEndpoints(source, target, data?.sourceHandle, data?.targetHandle, sourceX, sourceY, targetX, targetY);

  const [path] = isCenterAnchored
    ? getStraightPath({ sourceX: effectiveSourceX, sourceY: effectiveSourceY, targetX: effectiveTargetX, targetY: effectiveTargetY })
    : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: "var(--note-border)", strokeDasharray: "4 4" }} />;
}

import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, type EdgeProps } from "@xyflow/react";
import { diffStatusMeta } from "./diffStatus";
import { relationLabelText } from "./relationLabelText";
import type { RelationEdge as RelationEdgeType } from "./toFlowGraph";
import { useAnchoredEdgeEndpoints } from "./useAnchoredEdgeEndpoints";

export function RelationEdge({
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
  selected,
}: EdgeProps<RelationEdgeType>) {
  const {
    sourceX: effectiveSourceX,
    sourceY: effectiveSourceY,
    targetX: effectiveTargetX,
    targetY: effectiveTargetY,
    isCenterAnchored,
  } = useAnchoredEdgeEndpoints(source, target, data?.sourceHandle, data?.targetHandle, sourceX, sourceY, targetX, targetY);

  // The center anchor has no real side, so no `Position` reliably describes it — routing it
  // through getBezierPath would still curve the path as if leaving from Position.Top, kinking it
  // as it exits the node. A straight line has no such directional bias, so it's the only shape
  // that looks right here.
  const [path, labelX, labelY] = isCenterAnchored
    ? getStraightPath({ sourceX: effectiveSourceX, sourceY: effectiveSourceY, targetX: effectiveTargetX, targetY: effectiveTargetY })
    : getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const diff = diffStatusMeta(data?.diffStatus);

  const isUnrealized = data?.isUnrealized ?? false;
  const isDerived = data?.status === "derived";
  // In diff mode the diff status takes over color and dash pattern — same
  // reasoning as ElementNode: one signal, not diff color competing with the
  // unrealized/derived styling for attention. `added` has no dash (solid),
  // mirroring the node border styles for the same status.
  const color = diff ? diff.color : isUnrealized ? "var(--warning)" : isDerived ? "var(--accent)" : "var(--text)";
  const dashArray = diff
    ? diff.borderStyle === "dashed"
      ? "6 4"
      : diff.borderStyle === "dotted"
        ? "2 3"
        : undefined
    : isUnrealized
      ? "5 4"
      : undefined;
  const labelText = relationLabelText(data?.label, isUnrealized, diff);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : isDerived ? 2 : 1.5,
          strokeDasharray: dashArray,
        }}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            data-qa="relation-edge-label"
            style={{
              position: "absolute",
              zIndex: 1000,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: diff ? diff.bg : isUnrealized ? "var(--warning-bg)" : "var(--bg)",
              border: `1px solid ${diff ? diff.color : isUnrealized ? "var(--warning)" : "var(--border)"}`,
              color,
              pointerEvents: "none",
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

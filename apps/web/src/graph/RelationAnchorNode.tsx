import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RelationAnchorNode as RelationAnchorNodeType } from "./relationAnchors";

const HANDLE_STYLE = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 12,
  height: 12,
  background: "transparent",
  border: "none",
  opacity: 0,
};

// Invisible synthetic node at a relation's midpoint, existing only so a note
// can drag-link to a relation. Target-only handle, deliberately: an anchor
// never originates a drag (nothing points FROM a relation), which doubles as
// a structural guard alongside resolveAnnotationConnection's runtime check
// against an element/anchor-sourced drag landing here.
export function RelationAnchorNode(_props: NodeProps<RelationAnchorNodeType>) {
  return (
    <div data-qa="relation-anchor-node" style={{ width: 1, height: 1 }}>
      <Handle type="target" position={Position.Top} id="center" style={HANDLE_STYLE} />
    </div>
  );
}

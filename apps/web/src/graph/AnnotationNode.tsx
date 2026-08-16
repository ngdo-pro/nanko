import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { AnnotationNode as AnnotationNodeType } from "./toAnnotationNodes";

const HANDLE_STYLE = { background: "var(--note-border)", width: 8, height: 8, border: "none" };

const CENTER_HANDLE_STYLE: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 20,
  height: 20,
  background: "transparent",
  border: "none",
  opacity: 0,
};

// One handle id per edge midpoint — same ids as ElementNode's, shared
// verbatim with the backend's source_handle values.
const ANCHORS: { id: "top" | "right" | "bottom" | "left"; position: Position }[] = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
];

// Both a target and a source handle at the same point, sharing one id — same
// shape as ElementNode's AnchorHandles, and for the same reason: target first,
// source second, so the source handle sits on top in the DOM and is the one
// that reacts to an outgoing drag, while the target underneath stays reachable
// for an incoming one (xyflow's drop detection is distance-based, not a strict
// DOM hit-test).
function AnchorHandles({ id, position, style }: { id: string; position: Position; style: CSSProperties }) {
  return (
    <>
      <Handle type="target" position={position} id={id} style={style} />
      <Handle type="source" position={position} id={id} style={style} />
    </>
  );
}

// A sticky note — deliberately plain (no rotation/tape/pin decoration), same
// "plain box" philosophy already applied to ElementNode: the payoff of extra
// visual flourish here is unproven and not worth the fiddliness. Both target
// and source handles: a note can point AT an element, a relation, or another
// note, and can itself receive a link dragged from another note.
export function AnnotationNode({ data, selected }: NodeProps<AnnotationNodeType>) {
  const [draft, setDraft] = useState(data.body);

  // Reset the draft whenever editing starts (or the underlying body changes
  // while not editing) — mirrors ElementPanel's reset-on-reselect pattern.
  useEffect(() => {
    if (data.isEditing) setDraft(data.body);
  }, [data.isEditing, data.body]);

  return (
    <div
      data-qa="annotation-node"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "180px",
        minHeight: "100px",
        padding: "10px 12px",
        borderRadius: "4px",
        border: `1px solid ${selected ? "var(--accent)" : "var(--note-border)"}`,
        background: "var(--note-bg)",
        color: "var(--note-text)",
        boxShadow: selected ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)",
        fontSize: "13px",
      }}
    >
      {data.isEditing ? (
        <textarea
          data-qa="annotation-node-edit"
          className="nodrag nopan"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => data.onCommitEdit?.(draft)}
          onKeyDown={(e) => {
            if (e.key === "Escape") data.onCancelEdit?.();
          }}
          style={{
            flex: 1,
            resize: "none",
            font: "inherit",
            fontSize: "13px",
            color: "var(--note-text)",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            minHeight: "60px",
          }}
        />
      ) : (
        <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{data.body}</span>
      )}

      <span style={{ fontSize: "11px", opacity: 0.75, alignSelf: "flex-end" }}>— {data.authorName}</span>

      {ANCHORS.map((anchor) => (
        <AnchorHandles key={anchor.id} id={anchor.id} position={anchor.position} style={HANDLE_STYLE} />
      ))}
      <AnchorHandles id="center" position={Position.Top} style={CENTER_HANDLE_STYLE} />
    </div>
  );
}

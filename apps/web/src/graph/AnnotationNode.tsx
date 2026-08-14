import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import type { AnnotationNode as AnnotationNodeType } from "./toAnnotationNodes";

const HANDLE_STYLE = { background: "var(--note-border)", width: 8, height: 8, border: "none" };

// A sticky note — deliberately plain (no rotation/tape/pin decoration), same
// "plain box" philosophy already applied to ElementNode: the payoff of extra
// visual flourish here is unproven and not worth the fiddliness. Source-only
// handle (no target): a note can point AT an element, nothing can point INTO
// a note — dragging a relation onto one is simply not a valid connection.
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

      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CSSProperties, ReactNode } from "react";
import type { ElementArchetype } from "../api";
import { diffStatusMeta } from "./diffStatus";
import { technologyColor } from "./technologyColor";
import type { ElementNode as ElementNodeType } from "./toFlowGraph";

const HANDLE_STYLE = { background: "var(--border)", width: 8, height: 8, border: "none" };

// One handle id per edge midpoint, shared verbatim with the backend's
// source_handle/target_handle values (RelationHandle in api.ts) — no mapping
// table to keep in sync. `position` only steers which way a connected edge's
// curve initially bows (xyflow has no true "center" position); Top is an
// arbitrary but consistent choice for the center anchor.
const EDGE_ANCHORS: { id: "top" | "right" | "bottom" | "left"; position: Position }[] = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
];

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

// Both a target and a source handle at the same point, sharing one id — a
// node can be dragged FROM or dropped ONTO any of its own anchors. Order
// matters: target first, source second, so the source handle sits on top in
// the DOM and is the one that reacts to an outgoing drag (xyflow's drop
// detection is distance-based, not a strict DOM hit-test, so the target
// handle underneath stays reachable as a drop target).
function AnchorHandles({ id, position, style }: { id: string; position: Position; style: CSSProperties }) {
  return (
    <>
      <Handle type="target" position={position} id={id} style={style} />
      <Handle type="source" position={position} id={id} style={style} />
    </>
  );
}

// database/queue are distinguished by an icon and the technology's brand
// color, not by a custom card shape — kept deliberately plain (a cylinder/
// pipe silhouette was tried and reverted per feedback: too fiddly to get
// right relative to the payoff, for now a plain box reads just as clearly).
export function ElementNode({ data, selected }: NodeProps<ElementNodeType>) {
  const techColor = technologyColor(data.technology);
  const diff = diffStatusMeta(data.diffStatus);

  // Mixing the `border` shorthand with a `borderLeft` longhand in the same
  // style object serializes unreliably (jsdom drops the shorthand entirely
  // once a longhand touches the same property) — every side is spelled out
  // explicitly instead, so there's no shorthand/longhand ambiguity anywhere.
  // In diff mode, the diff status takes over all four sides (color + border
  // style) — a milestone-comparison overlay showing both the technology tint
  // and a diff color at once would dilute the one signal that view exists for.
  const edgeBorder = diff
    ? `1.5px ${diff.borderStyle} ${diff.color}`
    : `1.5px ${data.isExternal ? "dashed" : "solid"} ${selected ? "var(--accent)" : "var(--border)"}`;
  const leftBorder = diff ? edgeBorder : techColor ? `4px solid ${techColor}` : edgeBorder;

  return (
    <div
      data-qa="element-node"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: "180px",
        maxWidth: "240px",
        padding: "12px 14px",
        borderRadius: "10px",
        borderTop: edgeBorder,
        borderRight: edgeBorder,
        borderBottom: edgeBorder,
        borderLeft: leftBorder,
        background: "var(--bg)",
        boxShadow: selected ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)",
        color: "var(--text)",
        opacity: data.diffStatus === "removed" ? 0.6 : 1,
      }}
    >
      {diff && <DiffBadge meta={diff} />}

      {EDGE_ANCHORS.map((anchor) => (
        <AnchorHandles key={anchor.id} id={anchor.id} position={anchor.position} style={HANDLE_STYLE} />
      ))}
      <AnchorHandles id="center" position={Position.Top} style={CENTER_HANDLE_STYLE} />

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <ArchetypeIcon archetype={data.archetype} color={techColor} />
        <strong style={{ color: "var(--text-h)", fontSize: "15px", lineHeight: "125%" }}>{data.label}</strong>
      </div>

      {data.description && <span style={{ fontSize: "13px" }}>{data.description}</span>}

      {(data.technology || data.isExternal) && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
          {data.technology && <Badge>{data.technology}</Badge>}
          {data.isExternal && <Badge>External</Badge>}
        </div>
      )}
    </div>
  );
}

function DiffBadge({ meta }: { meta: ReturnType<typeof diffStatusMeta> }) {
  if (!meta) return null;

  return (
    <span
      data-qa="element-node-diff-badge"
      aria-label={meta.label}
      title={meta.label}
      style={{
        position: "absolute",
        top: "-9px",
        right: "-9px",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: 700,
        lineHeight: 1,
        color: meta.color,
        background: meta.bg,
        border: `1.5px solid ${meta.color}`,
      }}
    >
      {meta.symbol}
    </span>
  );
}

function ArchetypeIcon({ archetype, color }: { archetype: ElementArchetype | null; color: string | null }) {
  if (archetype !== "database" && archetype !== "queue") return null;

  return (
    <span data-qa="element-node-archetype-icon" style={{ display: "flex", color: color ?? "var(--text-h)", flexShrink: 0 }}>
      {archetype === "database" ? <DatabaseIcon /> : <QueueIcon />}
    </span>
  );
}

function DatabaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="8" cy="4" rx="6" ry="2.5" />
      <path d="M2 4v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V4" />
      <path d="M2 8v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V8" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <rect x="1.5" y="3" width="3.5" height="10" rx="1" />
      <rect x="6.5" y="3" width="3.5" height="10" rx="1" />
      <rect x="11.5" y="3" width="3.5" height="10" rx="1" />
    </svg>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: "11px",
        lineHeight: "1",
        padding: "3px 6px",
        borderRadius: "4px",
        color: "var(--accent)",
        background: "var(--accent-bg)",
      }}
    >
      {children}
    </span>
  );
}

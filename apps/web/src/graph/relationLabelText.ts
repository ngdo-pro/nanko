import type { DiffStatusMeta } from "./diffStatus";

// Extracted into its own file (not co-located in RelationEdge.tsx) so it can
// be unit-tested directly, and so RelationEdge.tsx only exports the
// component — React Flow edges/labels never render in jsdom (EdgeLabelRenderer
// portals into a container only the full <ReactFlow> wrapper creates), the
// same limitation already documented for edge selection.
export function relationLabelText(label: string | null | undefined, isUnrealized: boolean, diff: DiffStatusMeta | null): string | null {
  // The diff symbol must show even when the relation has no label (the
  // common case) — it's the primary diff signal for relations, not a
  // decoration tacked onto an existing label.
  if (diff) return label ? `${diff.symbol} ${label}` : diff.symbol;
  if (isUnrealized) return `${label ? `${label} — ` : ""}not realized`;
  return label ?? null;
}

import type { CSSProperties } from "react";
import { diffStatusMeta } from "../graph/diffStatus";
import type { DiffStatus, ElementNode, RelationEdge } from "../graph/toFlowGraph";

const STATUSES: Exclude<DiffStatus, "unchanged">[] = ["added", "modified", "removed"];

const PANEL_STYLE: CSSProperties = {
  width: "260px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "16px",
  borderLeft: "1px solid var(--border)",
  background: "var(--bg)",
  overflowY: "auto",
};

function relationLabel(edge: RelationEdge, labelById: Map<string, string>): string {
  const sourceLabel = labelById.get(edge.source) ?? edge.source;
  const targetLabel = labelById.get(edge.target) ?? edge.target;
  const suffix = edge.data?.label ? `: ${edge.data.label}` : "";
  return `${sourceLabel} → ${targetLabel}${suffix}`;
}

// Textual complement to the overlay canvas — a relation's diff badge is tiny
// on the canvas and easy to miss, and scanning a busy diagram for every
// changed item doesn't scale. This lists the same statuses as a flat list,
// grouped by added/modified/removed, always visible in overlay mode (not a
// selection-driven panel like ElementPanel/RelationPanel).
export function DiffPanel({ nodes, edges }: { nodes: ElementNode[]; edges: RelationEdge[] }) {
  const labelById = new Map(nodes.map((node) => [node.id, node.data.label]));

  const sections = STATUSES.map((status) => ({
    status,
    elements: nodes.filter((node) => node.data.diffStatus === status),
    relations: edges.filter((edge) => edge.data?.diffStatus === status),
  })).filter((section) => section.elements.length > 0 || section.relations.length > 0);

  return (
    <div data-qa="diff-panel" style={PANEL_STYLE}>
      <strong style={{ color: "var(--text-h)", fontSize: "13px" }}>Changes</strong>

      {sections.length === 0 && (
        <p data-qa="diff-panel-empty" style={{ fontSize: "13px", color: "var(--text)", margin: 0 }}>
          No differences between these two milestones.
        </p>
      )}

      {sections.map(({ status, elements, relations }) => {
        const meta = diffStatusMeta(status);
        if (!meta) return null;

        return (
          <div key={status} data-qa={`diff-panel-section-${status}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: meta.color }}>
              {meta.symbol} {meta.label} ({elements.length + relations.length})
            </span>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
              {elements.map((node) => (
                <li key={node.id} data-qa="diff-panel-item" style={{ fontSize: "13px", color: "var(--text-h)" }}>
                  {node.data.label}
                  {status === "modified" && node.data.changedFields && node.data.changedFields.length > 0 && (
                    <span style={{ color: "var(--text)" }}> — {node.data.changedFields.join(", ")}</span>
                  )}
                </li>
              ))}
              {relations.map((edge) => (
                <li key={edge.id} data-qa="diff-panel-item" style={{ fontSize: "13px", color: "var(--text-h)" }}>
                  {relationLabel(edge, labelById)}
                  {status === "modified" && edge.data?.changedFields && edge.data.changedFields.length > 0 && (
                    <span style={{ color: "var(--text)" }}> — {edge.data.changedFields.join(", ")}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

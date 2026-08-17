import type { DiffStatus } from "./toFlowGraph";

// Redundant encoding for the milestone-comparison overlay, per TECHNICAL_REFERENCE.md's
// accessibility requirement: never rely on color alone. Each status pairs a
// color with both a distinct border style and a symbol, so the diff reads
// correctly even without color perception.
export type DiffStatusMeta = { color: string; bg: string; symbol: string; label: string; borderStyle: "solid" | "dashed" | "dotted" };

const DIFF_STATUS_META: Record<Exclude<DiffStatus, "unchanged">, DiffStatusMeta> = {
  added: { color: "var(--diff-added)", bg: "var(--diff-added-bg)", symbol: "+", label: "Added", borderStyle: "solid" },
  removed: { color: "var(--diff-removed)", bg: "var(--diff-removed-bg)", symbol: "−", label: "Removed", borderStyle: "dashed" },
  modified: { color: "var(--diff-modified)", bg: "var(--diff-modified-bg)", symbol: "~", label: "Modified", borderStyle: "dotted" },
};

export function diffStatusMeta(status: DiffStatus | undefined): DiffStatusMeta | null {
  if (!status || status === "unchanged") return null;
  return DIFF_STATUS_META[status];
}

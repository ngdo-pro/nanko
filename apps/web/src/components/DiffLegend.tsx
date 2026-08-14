import { diffStatusMeta } from "../graph/diffStatus";
import type { DiffStatus } from "../graph/toFlowGraph";

const STATUSES: Exclude<DiffStatus, "unchanged">[] = ["added", "modified", "removed"];

// Always visible alongside the overlay canvas — the diff badges/borders are
// legible on their own (color + border style + symbol), but a legend is
// still the only way to learn what the symbols mean the first time.
export function DiffLegend() {
  return (
    <div data-qa="diff-legend" style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "12px", color: "var(--text)" }}>
      {STATUSES.map((status) => {
        const meta = diffStatusMeta(status);
        if (!meta) return null;

        return (
          <span key={status} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                fontSize: "10px",
                fontWeight: 700,
                lineHeight: 1,
                color: meta.color,
                background: meta.bg,
                border: `1.5px solid ${meta.color}`,
              }}
            >
              {meta.symbol}
            </span>
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

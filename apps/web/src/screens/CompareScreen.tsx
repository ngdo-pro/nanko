import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Graph, Milestone } from "../api";
import { DiffLegend } from "../components/DiffLegend";
import { DiffPanel } from "../components/DiffPanel";
import { Toolbar } from "../components/Toolbar";
import { CanvasGraph } from "../graph/CanvasGraph";
import { toOverlayFlowGraph, type DiffResult } from "../graph/diff";
import { OverlayGraph } from "../graph/OverlayGraph";
import type { Level } from "../graph/toFlowGraph";
import { useDiff } from "../hooks/useDiff";
import { useGraph } from "../hooks/useGraph";
import { useMilestones } from "../hooks/useMilestones";
import { routes } from "../routes";
import { COMPACT_INPUT_STYLE, ERROR_TEXT_STYLE, STATE_CONTAINER_STYLE, toggleButtonStyle } from "../styles/controls";

// Milestone comparison is scoped to C1 (the whole system landscape) in v1 —
// drilling into a system/container while comparing is a possible future
// extension, not required for the side-by-side view to be useful on its own.
const ROOT_LEVEL: Level = { kind: "system", parentId: null };

type Mode = "side-by-side" | "overlay";

function milestoneLabel(milestones: Milestone[], milestoneId: string): string {
  return milestones.find((m) => m.id === milestoneId)?.label ?? milestoneId;
}

function CompareScreen() {
  const { projectId } = useParams<{ projectId: string }>();
  const [milestonesState] = useMilestones(projectId);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("side-by-side");

  // Once the milestones list resolves, default to the two most recent
  // milestones — only while nothing has been picked yet, so it never
  // overrides a deliberate selection.
  useEffect(() => {
    if (milestonesState.status !== "loaded" || fromId !== null || toId !== null) return;

    const sorted = [...milestonesState.milestones].sort((a, b) => a.sort_order - b.sort_order);
    if (sorted.length < 2) return;

    setFromId(sorted[sorted.length - 2].id);
    setToId(sorted[sorted.length - 1].id);
  }, [milestonesState, fromId, toId]);

  const fromGraph = useGraph(projectId, fromId, null);
  const toGraph = useGraph(projectId, toId, null);
  // Fetched regardless of mode: overlay needs it, and it's cheap C1-only
  // data — simpler than threading a conditional fetch through the mode toggle.
  const diffState = useDiff(projectId, fromId, toId);

  return (
    <main style={{ fontFamily: "monospace", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar>
        {projectId && (
          <Link data-qa="compare-exit" to={routes.canvas(projectId)} style={{ color: "var(--text-h)", fontSize: "13px" }}>
            ← Canvas
          </Link>
        )}
        {milestonesState.status === "loaded" && milestonesState.milestones.length >= 2 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center", fontSize: "13px", color: "var(--text)" }}>
            <label style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              From
              <select
                data-qa="compare-from-select"
                style={COMPACT_INPUT_STYLE}
                value={fromId ?? ""}
                onChange={(e) => setFromId(e.target.value || null)}
              >
                {milestonesState.milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              To
              <select data-qa="compare-to-select" style={COMPACT_INPUT_STYLE} value={toId ?? ""} onChange={(e) => setToId(e.target.value || null)}>
                {milestonesState.milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.label}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                data-qa="compare-mode-side-by-side"
                style={{ ...toggleButtonStyle(mode === "side-by-side"), padding: "4px 10px" }}
                onClick={() => setMode("side-by-side")}
              >
                Side-by-side
              </button>
              <button
                type="button"
                data-qa="compare-mode-overlay"
                style={{ ...toggleButtonStyle(mode === "overlay"), padding: "4px 10px" }}
                onClick={() => setMode("overlay")}
              >
                Overlay
              </button>
            </div>
            {mode === "overlay" && <DiffLegend />}
          </div>
        )}
      </Toolbar>

      {milestonesState.status === "loading" && (
        <p data-qa="compare-loading" style={STATE_CONTAINER_STYLE}>
          loading...
        </p>
      )}
      {milestonesState.status === "no-milestone" && (
        <p data-qa="compare-no-milestone" style={STATE_CONTAINER_STYLE}>
          This project has no milestone yet.
        </p>
      )}
      {milestonesState.status === "error" && (
        <p data-qa="compare-error" style={{ ...STATE_CONTAINER_STYLE, ...ERROR_TEXT_STYLE }}>
          {milestonesState.message}
        </p>
      )}
      {milestonesState.status === "loaded" && milestonesState.milestones.length < 2 && (
        <p data-qa="compare-not-enough-milestones" style={STATE_CONTAINER_STYLE}>
          This project needs at least two milestones to compare.
        </p>
      )}

      {milestonesState.status === "loaded" && fromId && toId && projectId && mode === "side-by-side" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid var(--border)" }}>
            <PaneHeader label={milestoneLabel(milestonesState.milestones, fromId)} />
            {fromGraph.status === "ready" ? (
              <CanvasGraph readOnly dataQa="compare-canvas-from" projectId={projectId} graph={fromGraph.graph} level={ROOT_LEVEL} milestoneId={fromId} />
            ) : (
              <p data-qa="compare-loading" style={STATE_CONTAINER_STYLE}>
                loading...
              </p>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <PaneHeader label={milestoneLabel(milestonesState.milestones, toId)} />
            {toGraph.status === "ready" ? (
              <CanvasGraph readOnly dataQa="compare-canvas-to" projectId={projectId} graph={toGraph.graph} level={ROOT_LEVEL} milestoneId={toId} />
            ) : (
              <p data-qa="compare-loading" style={STATE_CONTAINER_STYLE}>
                loading...
              </p>
            )}
          </div>
        </div>
      )}

      {milestonesState.status === "loaded" && fromId && toId && mode === "overlay" && (
        <>
          {fromGraph.status === "ready" && toGraph.status === "ready" && diffState.status === "ready" ? (
            <OverlayView fromGraph={fromGraph.graph} toGraph={toGraph.graph} diff={diffState.diff} />
          ) : diffState.status === "error" ? (
            <p data-qa="compare-error" style={{ ...STATE_CONTAINER_STYLE, ...ERROR_TEXT_STYLE }}>
              {diffState.message}
            </p>
          ) : (
            <p data-qa="compare-loading">loading...</p>
          )}
        </>
      )}
    </main>
  );
}

function OverlayView({ fromGraph, toGraph, diff }: { fromGraph: Graph; toGraph: Graph; diff: DiffResult }) {
  // Computed once and shared: OverlayGraph renders it, DiffPanel is a
  // textual view of the exact same merged nodes/edges, not a second
  // independent derivation of the diff.
  const { nodes, edges } = toOverlayFlowGraph(fromGraph, toGraph, diff, ROOT_LEVEL);

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <OverlayGraph nodes={nodes} edges={edges} dataQa="compare-canvas-overlay" />
      <DiffPanel nodes={nodes} edges={edges} />
    </div>
  );
}

function PaneHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "6px 12px",
        fontSize: "12px",
        color: "var(--text)",
        borderBottom: "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
}

export default CompareScreen;

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createMilestone, type Graph, type Milestone, reorderMilestones, updateMilestone } from "../api";
import { Breadcrumb, type Crumb } from "../components/Breadcrumb";
import { MilestoneTimeline } from "../components/MilestoneTimeline";
import { Toolbar } from "../components/Toolbar";
import { CanvasGraph } from "../graph/CanvasGraph";
import { levelFromParams, type Level } from "../graph/toFlowGraph";
import { useGraph } from "../hooks/useGraph";
import { useMilestones } from "../hooks/useMilestones";
import { routes } from "../routes";
import { ERROR_TEXT_STYLE, PRIMARY_BUTTON_STYLE, STATE_CONTAINER_STYLE } from "../styles/controls";

// A double-click on a node drills one level down; `null` at the component
// level (C3), the deepest level in V1 — there is nothing further to open.
function drillDownPath(level: Level, projectId: string, elementId: string): string | null {
  if (level.kind === "system") return routes.system(projectId, elementId);
  if (level.kind === "container") return routes.container(projectId, level.parentId, elementId);
  return null;
}

function buildBreadcrumb(projectId: string, graph: Graph, systemId?: string, containerId?: string): Crumb[] {
  const items: Crumb[] = [{ label: "C1", to: systemId ? routes.canvas(projectId) : null }];

  if (systemId) {
    const system = graph.elements.find((element) => element.id === systemId);
    items.push({ label: `C2: ${system?.name ?? systemId}`, to: containerId ? routes.system(projectId, systemId) : null });
  }

  if (containerId) {
    const container = graph.elements.find((element) => element.id === containerId);
    items.push({ label: `C3: ${container?.name ?? containerId}`, to: null });
  }

  return items;
}

function CanvasScreen() {
  const { projectId, systemId, containerId } = useParams<{ projectId: string; systemId?: string; containerId?: string }>();
  const navigate = useNavigate();
  const [milestonesState, setMilestonesState] = useMilestones(projectId);
  const [milestoneId, setMilestoneId] = useState<string | null>(null);

  const level = levelFromParams(systemId, containerId);
  const scopeElementId = level.parentId;
  const graphState = useGraph(projectId, milestoneId, scopeElementId);

  // The milestone selection is preserved across drill-down navigation (not
  // reset to latest) but must reset when switching to a different project.
  useEffect(() => {
    setMilestoneId(null);
  }, [projectId]);

  // Once the milestones list resolves for a project with no selection yet,
  // default to the latest one (by sort_order).
  useEffect(() => {
    if (milestonesState.status === "loaded" && milestoneId === null) {
      const latest = [...milestonesState.milestones].sort((a, b) => b.sort_order - a.sort_order)[0];
      setMilestoneId(latest.id);
    }
  }, [milestonesState, milestoneId]);

  return (
    <main style={{ fontFamily: "monospace", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar>
        {graphState.status === "ready" && projectId && <Breadcrumb items={buildBreadcrumb(projectId, graphState.graph, systemId, containerId)} />}
        {milestonesState.status === "loaded" && milestoneId && projectId && (
          // Pushed to the far right of the toolbar (Toolbar is a flex row) so it
          // never sits flush against the C1/C2/C3 breadcrumb navigation on the left.
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <Link data-qa="canvas-compare-link" to={routes.compare(projectId)} style={{ color: "var(--text-h)", fontSize: "13px" }}>
              Compare
            </Link>
            <MilestoneTimeline
              milestones={milestonesState.milestones}
              selectedMilestoneId={milestoneId}
              onSelect={setMilestoneId}
              onCreate={() => {
                if (!projectId) return;

                createMilestone(projectId, "New milestone", null)
                  .then((res) => res.json())
                  .then((created: Milestone) => {
                    setMilestonesState((state) =>
                      state.status === "loaded" ? { status: "loaded", milestones: [...state.milestones, created] } : state,
                    );
                    setMilestoneId(created.id);
                  })
                  .catch((err) => console.error("Failed to create milestone", err));
              }}
              onUpdate={(id, label, occursOn) => {
                updateMilestone(id, label, occursOn)
                  .then((res) => res.json())
                  .then((updated: Milestone) => {
                    setMilestonesState((state) =>
                      state.status === "loaded"
                        ? { status: "loaded", milestones: state.milestones.map((m) => (m.id === id ? updated : m)) }
                        : state,
                    );
                  })
                  .catch((err) => console.error(`Failed to update milestone ${id}`, err));
              }}
              onReorder={(orderedIds) => {
                if (!projectId) return;

                reorderMilestones(projectId, orderedIds)
                  .then((res) => res.json())
                  .then((reordered: Milestone[]) => {
                    setMilestonesState({ status: "loaded", milestones: reordered });
                  })
                  .catch((err) => console.error("Failed to reorder milestones", err));
              }}
            />
          </div>
        )}
      </Toolbar>

      {milestonesState.status === "loading" && (
        <p data-qa="canvas-loading" style={STATE_CONTAINER_STYLE}>
          loading...
        </p>
      )}
      {milestonesState.status === "no-milestone" && (
        <div data-qa="canvas-no-milestone" style={STATE_CONTAINER_STYLE}>
          <p>This project has no milestone yet.</p>
          <button
            type="button"
            data-qa="canvas-create-first-milestone"
            style={PRIMARY_BUTTON_STYLE}
            onClick={() => {
              if (!projectId) return;

              createMilestone(projectId, "New milestone", null)
                .then((res) => res.json())
                .then((created: Milestone) => {
                  setMilestonesState({ status: "loaded", milestones: [created] });
                  setMilestoneId(created.id);
                })
                .catch((err) => console.error("Failed to create milestone", err));
            }}
          >
            Create first milestone
          </button>
        </div>
      )}
      {milestonesState.status === "error" && (
        <p data-qa="canvas-error" style={{ ...STATE_CONTAINER_STYLE, ...ERROR_TEXT_STYLE }}>
          {milestonesState.message}
        </p>
      )}
      {milestonesState.status === "loaded" && milestoneId && (
        <>
          {graphState.status === "loading" && (
            <p data-qa="canvas-loading" style={STATE_CONTAINER_STYLE}>
              loading...
            </p>
          )}
          {graphState.status === "error" && (
            <p data-qa="canvas-error" style={{ ...STATE_CONTAINER_STYLE, ...ERROR_TEXT_STYLE }}>
              {graphState.message}
            </p>
          )}
          {graphState.status === "ready" && projectId && (
            <CanvasGraph
              // Remounts on level or milestone change so the local nodes/edges
              // state (and any in-progress drag/selection) resets instead of
              // carrying over the previous level's or milestone's.
              key={`${level.kind}:${level.parentId ?? "root"}:${milestoneId}`}
              projectId={projectId}
              graph={graphState.graph}
              level={level}
              milestoneId={milestoneId}
              onNodeDoubleClick={(elementId) => {
                const to = drillDownPath(level, projectId, elementId);
                if (to) navigate(to);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}

export default CanvasScreen;

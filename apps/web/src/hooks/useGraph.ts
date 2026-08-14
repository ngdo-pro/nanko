import { useEffect, useState } from "react";
import { API_URL, type Graph } from "../api";

export type GraphState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; graph: Graph };

// Loads the graph for a (milestone, drill-down scope) pair — re-fetches
// whenever any of the three changes. No-ops while `milestoneId` is null
// (e.g. before the milestones list has resolved a selection).
export function useGraph(projectId: string | undefined, milestoneId: string | null, scopeElementId: string | null): GraphState {
  const [state, setState] = useState<GraphState>({ status: "loading" });

  useEffect(() => {
    if (!projectId || !milestoneId) return;

    let cancelled = false;
    setState({ status: "loading" });
    const scopeParam = scopeElementId ? `&scope_element_id=${scopeElementId}` : "";

    fetch(`${API_URL}/api/projects/${projectId}/graph?milestone_id=${milestoneId}${scopeParam}`)
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .catch(() => null)
            .then((body) => {
              throw new Error(body?.error ?? `Request failed with status ${res.status}`);
            });
        }
        return res.json();
      })
      .then((graph: Graph) => {
        if (cancelled) return;
        setState({ status: "ready", graph });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, scopeElementId, milestoneId]);

  return state;
}

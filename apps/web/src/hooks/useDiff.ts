import { useEffect, useState } from "react";
import { API_URL } from "../api";
import type { DiffResult } from "../graph/diff";

export type DiffState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; diff: DiffResult };

// Loads the diff between two milestones (C1-only in v1, cf. GraphDiffController).
// No-ops while either milestone id is null.
export function useDiff(projectId: string | undefined, fromMilestoneId: string | null, toMilestoneId: string | null): DiffState {
  const [state, setState] = useState<DiffState>({ status: "loading" });

  useEffect(() => {
    if (!projectId || !fromMilestoneId || !toMilestoneId) return;

    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${API_URL}/api/projects/${projectId}/diff?from_milestone_id=${fromMilestoneId}&to_milestone_id=${toMilestoneId}`)
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
      .then((diff: DiffResult) => {
        if (cancelled) return;
        setState({ status: "ready", diff });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, fromMilestoneId, toMilestoneId]);

  return state;
}

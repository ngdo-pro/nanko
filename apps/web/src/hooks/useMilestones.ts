import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { API_URL, type Milestone } from "../api";

export type MilestonesState =
  | { status: "loading" }
  | { status: "no-milestone" }
  | { status: "error"; message: string }
  | { status: "loaded"; milestones: Milestone[] };

// Loads the milestones list for a project. `setState` is exposed alongside
// the state so callers that mutate milestones (create/update/reorder) can
// apply the API response locally instead of refetching the whole list.
export function useMilestones(projectId: string | undefined): [MilestonesState, Dispatch<SetStateAction<MilestonesState>>] {
  const [state, setState] = useState<MilestonesState>({ status: "loading" });

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${API_URL}/api/projects/${projectId}/milestones`)
      .then((res) => res.json())
      .then((milestones: Milestone[]) => {
        if (cancelled) return;
        setState(milestones.length === 0 ? { status: "no-milestone" } : { status: "loaded", milestones });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return [state, setState];
}

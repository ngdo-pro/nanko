import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { API_URL, type Annotation } from "../api";

export type AnnotationsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; annotations: Annotation[] };

// Loads the annotations pinned on the current (project, scope) diagram —
// scope_element_id follows the same convention as the graph endpoint
// (null = C1 root). `setState` is exposed alongside the state so callers
// that create/delete annotations can apply the result locally instead of
// refetching the whole list. No-ops while `projectId` is undefined (e.g.
// read-only contexts that don't support annotating).
export function useAnnotations(
  projectId: string | undefined,
  scopeElementId: string | null,
): [AnnotationsState, Dispatch<SetStateAction<AnnotationsState>>] {
  const [state, setState] = useState<AnnotationsState>({ status: "loading" });

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setState({ status: "loading" });
    const scopeParam = scopeElementId ? `?scope_element_id=${scopeElementId}` : "";

    fetch(`${API_URL}/api/projects/${projectId}/annotations${scopeParam}`)
      .then((res) => res.json())
      .then((annotations: Annotation[]) => {
        if (cancelled) return;
        setState({ status: "loaded", annotations });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, scopeElementId]);

  return [state, setState];
}

import { Background, Controls, PanOnScrollMode, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_URL, type Graph, type Milestone } from "../api";
import { Toolbar } from "../components/Toolbar";
import { toFlowGraph } from "../graph/toFlowGraph";

type State =
  | { status: "loading" }
  | { status: "no-milestone" }
  | { status: "error"; message: string }
  | { status: "ready"; graph: Graph };

function CanvasScreen() {
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${API_URL}/api/projects/${projectId}/milestones`)
      .then((res) => res.json())
      .then((milestones: Milestone[]) => {
        if (cancelled) return;

        if (milestones.length === 0) {
          setState({ status: "no-milestone" });
          return;
        }

        const latest = [...milestones].sort((a, b) => b.sort_order - a.sort_order)[0];

        return fetch(`${API_URL}/api/projects/${projectId}/graph?milestone_id=${latest.id}`)
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
          });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <main style={{ fontFamily: "monospace", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar />

      {state.status === "loading" && <p data-qa="canvas-loading">loading...</p>}
      {state.status === "no-milestone" && <p data-qa="canvas-no-milestone">This project has no milestone yet.</p>}
      {state.status === "error" && (
        <p data-qa="canvas-error" style={{ color: "red" }}>
          {state.message}
        </p>
      )}
      {state.status === "ready" && <CanvasGraph graph={state.graph} />}
    </main>
  );
}

function CanvasGraph({ graph }: { graph: Graph }) {
  const { nodes, edges } = toFlowGraph(graph);

  return (
    <div data-qa="canvas-graph" style={{ flex: 1 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default CanvasScreen;

import type { Edge, Node } from "@xyflow/react";
import type { Graph } from "../api";

export type SystemNodeData = {
  // `label` is what React Flow's default node renderer displays.
  label: string;
  description: string | null;
  technology: string | null;
  isExternal: boolean;
};

const GRID_COLUMNS = 4;
const GRID_SPACING_X = 260;
const GRID_SPACING_Y = 160;

function fallbackPosition(index: number): { x: number; y: number } {
  return {
    x: (index % GRID_COLUMNS) * GRID_SPACING_X,
    y: Math.floor(index / GRID_COLUMNS) * GRID_SPACING_Y,
  };
}

export function toFlowGraph(graph: Graph): { nodes: Node<SystemNodeData>[]; edges: Edge[] } {
  const systems = graph.elements.filter((element) => element.kind === "system");
  const systemIds = new Set(systems.map((system) => system.id));

  const nodes: Node<SystemNodeData>[] = systems.map((system, index) => ({
    id: system.id,
    position: graph.positions[system.id] ?? fallbackPosition(index),
    data: {
      label: system.name,
      description: system.description,
      technology: system.technology,
      isExternal: system.is_external,
    },
  }));

  const edges: Edge[] = graph.relations
    .filter((relation) => systemIds.has(relation.source_element_id) && systemIds.has(relation.target_element_id))
    .map((relation) => ({
      id: relation.id,
      source: relation.source_element_id,
      target: relation.target_element_id,
      label: relation.label ?? undefined,
    }));

  return { nodes, edges };
}

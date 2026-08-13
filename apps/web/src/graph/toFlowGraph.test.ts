import { describe, expect, it } from "vitest";
import type { Graph, GraphElement, GraphRelation } from "../api";
import { toFlowGraph } from "./toFlowGraph";

function element(overrides: Partial<GraphElement> = {}): GraphElement {
  return {
    id: "element-1",
    project_id: "project-1",
    parent_id: null,
    kind: "system",
    is_external: false,
    name: "Booking",
    description: null,
    technology: null,
    ...overrides,
  };
}

function relation(overrides: Partial<GraphRelation> = {}): GraphRelation {
  return {
    id: "relation-1",
    source_element_id: "element-1",
    target_element_id: "element-2",
    status: "declared",
    label: null,
    technology: null,
    realized_at_milestone_id: null,
    ...overrides,
  };
}

function graph(overrides: Partial<Graph> = {}): Graph {
  return {
    elements: [],
    relations: [],
    positions: {},
    warnings: [],
    ...overrides,
  };
}

describe("toFlowGraph", () => {
  it("keeps only system-kind elements as nodes", () => {
    // GIVEN a system and a container element
    const input = graph({
      elements: [
        element({ id: "system-1", kind: "system", name: "Booking" }),
        element({ id: "container-1", kind: "container", parent_id: "system-1", name: "API" }),
      ],
    });

    // WHEN mapping to a flow graph
    const { nodes } = toFlowGraph(input);

    // THEN only the system-kind element becomes a node
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: "system-1", data: { label: "Booking" } });
  });

  it("uses the position from the API when available", () => {
    // GIVEN a system element with a known position
    const input = graph({
      elements: [element({ id: "system-1" })],
      positions: { "system-1": { x: 42, y: 7 } },
    });

    // WHEN mapping to a flow graph
    const { nodes } = toFlowGraph(input);

    // THEN the node position matches the API position
    expect(nodes[0].position).toEqual({ x: 42, y: 7 });
  });

  it("falls back to a deterministic grid position when none is provided", () => {
    // GIVEN two system elements with no positions
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
    });

    // WHEN mapping to a flow graph
    const { nodes } = toFlowGraph(input);

    // THEN each node gets a distinct, deterministic fallback position
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[1].position).toEqual({ x: 260, y: 0 });
  });

  it("maps relations between systems to edges", () => {
    // GIVEN a relation between two systems
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
      relations: [relation({ id: "relation-1", source_element_id: "system-1", target_element_id: "system-2", label: "calls" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input);

    // THEN the relation becomes an edge between the two system nodes
    expect(edges).toEqual([{ id: "relation-1", source: "system-1", target: "system-2", label: "calls" }]);
  });

  it("drops a relation whose endpoint is not a visible system node", () => {
    // GIVEN a relation pointing to an element absent from the elements list
    const input = graph({
      elements: [element({ id: "system-1" })],
      relations: [relation({ source_element_id: "system-1", target_element_id: "missing" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input);

    // THEN the dangling relation is dropped
    expect(edges).toEqual([]);
  });
});

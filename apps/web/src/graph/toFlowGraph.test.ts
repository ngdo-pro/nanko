import { describe, expect, it } from "vitest";
import type { Graph, GraphElement, GraphRelation, GraphWarning } from "../api";
import { levelFromParams, toFlowGraph } from "./toFlowGraph";

const ROOT_LEVEL = { kind: "system" as const, parentId: null };

function element(overrides: Partial<GraphElement> = {}): GraphElement {
  return {
    id: "element-1",
    project_id: "project-1",
    parent_id: null,
    kind: "system",
    is_external: false,
    archetype: null,
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

function warning(overrides: Partial<GraphWarning> = {}): GraphWarning {
  return {
    type: "unrealized_declared_relation",
    subject_id: "relation-1",
    message: "not realized",
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

describe("levelFromParams", () => {
  it("resolves the root C1 level when no route params are given", () => {
    // GIVEN no system or container id
    // WHEN resolving the level
    // THEN it is the root system level
    expect(levelFromParams(undefined, undefined)).toEqual({ kind: "system", parentId: null });
  });

  it("resolves the C2 container level scoped to the given system", () => {
    // GIVEN a system id but no container id
    // WHEN resolving the level
    // THEN it is the container level, scoped to that system
    expect(levelFromParams("system-1", undefined)).toEqual({ kind: "container", parentId: "system-1" });
  });

  it("resolves the C3 component level scoped to the given container", () => {
    // GIVEN both a system id and a container id
    // WHEN resolving the level
    // THEN it is the component level, scoped to the container (not the system)
    expect(levelFromParams("system-1", "container-1")).toEqual({ kind: "component", parentId: "container-1" });
  });
});

describe("toFlowGraph", () => {
  it("keeps only elements matching the level's kind and parent", () => {
    // GIVEN a system, one of its containers, and an unrelated system
    const input = graph({
      elements: [
        element({ id: "system-1", kind: "system", parent_id: null, name: "Booking" }),
        element({ id: "container-1", kind: "container", parent_id: "system-1", name: "API" }),
        element({ id: "system-2", kind: "system", parent_id: null, name: "Payment" }),
      ],
    });

    // WHEN mapping to a flow graph at the C1 root level
    const { nodes } = toFlowGraph(input, ROOT_LEVEL);

    // THEN only the root-level systems become nodes, typed for the custom ElementNode renderer
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id)).toEqual(["system-1", "system-2"]);
    expect(nodes[0]).toMatchObject({ id: "system-1", type: "element", data: { label: "Booking" } });
  });

  it("scopes elements to the given container when drilled into C2", () => {
    // GIVEN containers under two different systems
    const input = graph({
      elements: [
        element({ id: "container-1", kind: "container", parent_id: "system-1", name: "API" }),
        element({ id: "container-2", kind: "container", parent_id: "system-2", name: "Worker" }),
      ],
    });

    // WHEN mapping to a flow graph scoped to system-1
    const { nodes } = toFlowGraph(input, { kind: "container", parentId: "system-1" });

    // THEN only system-1's container is shown
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: "container-1", data: { label: "API" } });
  });

  it("scopes elements to the given container when drilled into C3", () => {
    // GIVEN components under two different containers
    const input = graph({
      elements: [
        element({ id: "component-1", kind: "component", parent_id: "container-1", name: "Router" }),
        element({ id: "component-2", kind: "component", parent_id: "container-2", name: "Worker loop" }),
      ],
    });

    // WHEN mapping to a flow graph scoped to container-1
    const { nodes } = toFlowGraph(input, { kind: "component", parentId: "container-1" });

    // THEN only container-1's component is shown
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: "component-1", data: { label: "Router" } });
  });

  it("uses the position from the API when available", () => {
    // GIVEN a system element with a known position
    const input = graph({
      elements: [element({ id: "system-1" })],
      positions: { "system-1": { x: 42, y: 7 } },
    });

    // WHEN mapping to a flow graph
    const { nodes } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the node position matches the API position
    expect(nodes[0].position).toEqual({ x: 42, y: 7 });
  });

  it("falls back to a deterministic grid position when none is provided", () => {
    // GIVEN two system elements with no positions
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
    });

    // WHEN mapping to a flow graph
    const { nodes } = toFlowGraph(input, ROOT_LEVEL);

    // THEN each node gets a distinct, deterministic fallback position
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[1].position).toEqual({ x: 260, y: 0 });
  });

  it("maps relations between visible elements to edges", () => {
    // GIVEN a declared relation between two systems
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
      relations: [
        relation({ id: "relation-1", source_element_id: "system-1", target_element_id: "system-2", label: "calls", status: "declared" }),
      ],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the relation becomes a typed edge carrying its label and status
    expect(edges).toEqual([
      {
        id: "relation-1",
        type: "relation",
        source: "system-1",
        target: "system-2",
        data: { label: "calls", technology: null, status: "declared", isUnrealized: false },
      },
    ]);
  });

  it("carries the relation's technology onto the edge", () => {
    // GIVEN a relation with a technology set
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
      relations: [relation({ id: "relation-1", source_element_id: "system-1", target_element_id: "system-2", technology: "HTTP" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the edge carries the technology, so editing the label doesn't risk clobbering it
    expect(edges[0].data).toMatchObject({ technology: "HTTP" });
  });

  it("marks a derived relation with the derived status", () => {
    // GIVEN a relation derived from container-level relations
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
      relations: [relation({ id: "relation-1", source_element_id: "system-1", target_element_id: "system-2", status: "derived" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the edge is marked as derived
    expect(edges[0].data).toMatchObject({ status: "derived" });
  });

  it("flags a declared relation reported as unrealized in the graph warnings", () => {
    // GIVEN a declared relation flagged by an unrealized_declared_relation warning
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
      relations: [relation({ id: "relation-1", source_element_id: "system-1", target_element_id: "system-2", status: "declared" })],
      warnings: [warning({ subject_id: "relation-1" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the edge data flags it as unrealized
    expect(edges[0].data).toMatchObject({ isUnrealized: true });
  });

  it("does not flag a declared relation absent from the graph warnings", () => {
    // GIVEN a declared relation with no matching warning
    const input = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" })],
      relations: [relation({ id: "relation-1", source_element_id: "system-1", target_element_id: "system-2", status: "declared" })],
      warnings: [warning({ subject_id: "some-other-relation" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the edge data does not flag it as unrealized
    expect(edges[0].data).toMatchObject({ isUnrealized: false });
  });

  it("drops a relation whose endpoint is not a visible node at this level", () => {
    // GIVEN a relation pointing to an element absent from the elements list
    const input = graph({
      elements: [element({ id: "system-1" })],
      relations: [relation({ source_element_id: "system-1", target_element_id: "missing" })],
    });

    // WHEN mapping to a flow graph
    const { edges } = toFlowGraph(input, ROOT_LEVEL);

    // THEN the dangling relation is dropped
    expect(edges).toEqual([]);
  });
});

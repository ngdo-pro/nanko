import { describe, expect, it } from "vitest";
import type { Graph, GraphElement, GraphRelation } from "../api";
import type { DiffResult } from "./diff";
import { toOverlayFlowGraph } from "./diff";

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
    source_element_id: "system-1",
    target_element_id: "system-2",
    status: "declared",
    label: null,
    technology: null,
    realized_at_milestone_id: null,
    source_handle: null,
    target_handle: null,
    ...overrides,
  };
}

function graph(overrides: Partial<Graph> = {}): Graph {
  return { elements: [], relations: [], positions: {}, warnings: [], ...overrides };
}

function diffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return { elements: [], relations: [], ...overrides };
}

describe("toOverlayFlowGraph", () => {
  it("tags an element only present in the target graph as added, using its own fields", () => {
    // GIVEN an element present only in "to"
    const from = graph({ elements: [] });
    const to = graph({ elements: [element({ id: "system-1", name: "Booking" })] });
    const diff = diffResult({ elements: [{ id: "system-1", status: "added", changed_fields: [] }] });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN the node is included, tagged as added, using the "to" version's fields
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: "system-1", data: { label: "Booking", diffStatus: "added" } });
  });

  it("tags an element only present in the source graph as removed, using its own fields and position", () => {
    // GIVEN an element present only in "from", at a known position
    const from = graph({ elements: [element({ id: "system-1", name: "Booking (old)" })], positions: { "system-1": { x: 10, y: 20 } } });
    const to = graph({ elements: [] });
    const diff = diffResult({ elements: [{ id: "system-1", status: "removed", changed_fields: [] }] });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN the node is still shown — using the "from" version's fields and position, not dropped
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: "system-1", position: { x: 10, y: 20 }, data: { label: "Booking (old)", diffStatus: "removed" } });
  });

  it("uses the target graph's fields and position for a modified element", () => {
    // GIVEN the same element in both graphs, with a different name and position
    const from = graph({ elements: [element({ id: "system-1", name: "Booking" })], positions: { "system-1": { x: 0, y: 0 } } });
    const to = graph({ elements: [element({ id: "system-1", name: "Booking v2" })], positions: { "system-1": { x: 50, y: 50 } } });
    const diff = diffResult({ elements: [{ id: "system-1", status: "modified", changed_fields: ["name"] }] });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN the "to" version's name and position are used
    expect(nodes[0]).toMatchObject({ position: { x: 50, y: 50 }, data: { label: "Booking v2", diffStatus: "modified" } });
  });

  it("falls back to the source graph's position for an added element the target never positioned", () => {
    // GIVEN an added element with no position recorded in either graph
    const from = graph({ elements: [] });
    const to = graph({ elements: [element({ id: "system-1" })] });
    const diff = diffResult({ elements: [{ id: "system-1", status: "added", changed_fields: [] }] });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN a deterministic fallback grid position is used
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("gives two never-positioned added elements distinct fallback positions", () => {
    // GIVEN two elements added between the two milestones, neither ever positioned
    const from = graph({ elements: [] });
    const to = graph({ elements: [element({ id: "system-1" }), element({ id: "system-2" })] });
    const diff = diffResult({
      elements: [
        { id: "system-1", status: "added", changed_fields: [] },
        { id: "system-2", status: "added", changed_fields: [] },
      ],
    });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN they don't land on top of each other
    expect(nodes[0].position).not.toEqual(nodes[1].position);
  });

  it("moves a never-positioned element off a real position it would otherwise collide with", () => {
    // GIVEN an added element with no saved position anywhere, and a second, unrelated element
    // whose real saved position happens to be exactly the first fallback grid slot (0, 0) — the
    // scenario from the reported bug: two unrelated elements landing on the exact same spot
    const from = graph({ elements: [element({ id: "system-1" })], positions: { "system-1": { x: 0, y: 0 } } });
    const to = graph({ elements: [element({ id: "system-1" }), element({ id: "system-2" })] });
    const diff = diffResult({
      elements: [
        { id: "system-1", status: "unchanged", changed_fields: [] },
        { id: "system-2", status: "added", changed_fields: [] },
      ],
    });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN the never-positioned element is moved to a free slot, not stacked on system-1
    const system1 = nodes.find((n) => n.id === "system-1");
    const system2 = nodes.find((n) => n.id === "system-2");
    expect(system1?.position).toEqual({ x: 0, y: 0 });
    expect(system2?.position).not.toEqual({ x: 0, y: 0 });
  });

  it("defaults an element absent from the diff result to unchanged", () => {
    // GIVEN an element present in both graphs but not listed in the diff (edge case: empty diff)
    const from = graph({ elements: [element({ id: "system-1" })] });
    const to = graph({ elements: [element({ id: "system-1" })] });
    const diff = diffResult({ elements: [] });

    // WHEN building the overlay graph
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN it is treated as unchanged
    expect(nodes[0].data.diffStatus).toBe("unchanged");
  });

  it("scopes elements to the given level, same as the single-milestone view", () => {
    // GIVEN a system and, under a different system, a container
    const from = graph({ elements: [] });
    const to = graph({
      elements: [element({ id: "system-1", kind: "system", parent_id: null }), element({ id: "container-1", kind: "container", parent_id: "system-2" })],
    });
    const diff = diffResult({
      elements: [
        { id: "system-1", status: "added", changed_fields: [] },
        { id: "container-1", status: "added", changed_fields: [] },
      ],
    });

    // WHEN building the overlay graph at the C1 root level
    const { nodes } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN only the system is included
    expect(nodes.map((n) => n.id)).toEqual(["system-1"]);
  });

  it("shows a retargeted relation as a removed old id and an added new id, never modified", () => {
    // GIVEN a relation retargeted between milestones (old id removed, new id added, per GraphDiffer)
    const from = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" }), element({ id: "system-3" })],
      relations: [relation({ id: "relation-old", source_element_id: "system-1", target_element_id: "system-2" })],
    });
    const to = graph({
      elements: [element({ id: "system-1" }), element({ id: "system-2" }), element({ id: "system-3" })],
      relations: [relation({ id: "relation-new", source_element_id: "system-1", target_element_id: "system-3" })],
    });
    const diff = diffResult({
      elements: [
        { id: "system-1", status: "unchanged", changed_fields: [] },
        { id: "system-2", status: "unchanged", changed_fields: [] },
        { id: "system-3", status: "unchanged", changed_fields: [] },
      ],
      relations: [
        { id: "relation-old", status: "removed", changed_fields: [] },
        { id: "relation-new", status: "added", changed_fields: [] },
      ],
    });

    // WHEN building the overlay graph
    const { edges } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN both the old and new relation are shown, with their own statuses
    expect(edges).toHaveLength(2);
    expect(edges.find((e) => e.id === "relation-old")).toMatchObject({ target: "system-2", data: { diffStatus: "removed" } });
    expect(edges.find((e) => e.id === "relation-new")).toMatchObject({ target: "system-3", data: { diffStatus: "added" } });
  });

  it("drops a relation whose endpoints are not visible at this level in either graph", () => {
    // GIVEN a relation pointing to an element absent from both graphs' visible elements
    const from = graph({ elements: [element({ id: "system-1" })], relations: [relation({ source_element_id: "system-1", target_element_id: "missing" })] });
    const to = graph({ elements: [element({ id: "system-1" })] });
    const diff = diffResult({ relations: [{ id: "relation-1", status: "removed", changed_fields: [] }] });

    // WHEN building the overlay graph
    const { edges } = toOverlayFlowGraph(from, to, diff, ROOT_LEVEL);

    // THEN the dangling relation is dropped
    expect(edges).toEqual([]);
  });
});

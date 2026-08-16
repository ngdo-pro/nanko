import { describe, expect, it } from "vitest";
import type { ElementNode, RelationEdge } from "./toFlowGraph";
import { relationAnchorId, relationIdFromAnchorId, toRelationAnchorNodes } from "./relationAnchors";

function elementNode(id: string, x: number, y: number): ElementNode {
  return {
    id,
    type: "element",
    position: { x, y },
    data: { label: id, description: null, technology: null, isExternal: false, archetype: null },
  };
}

function relationEdge(id: string, source: string, target: string): RelationEdge {
  return {
    id,
    type: "relation",
    source,
    target,
    sourceHandle: "bottom",
    targetHandle: "top",
    data: { label: null, technology: null, status: "declared", isUnrealized: false, sourceHandle: "bottom", targetHandle: "top" },
  };
}

describe("relationAnchorId / relationIdFromAnchorId", () => {
  it("round-trips a relation id through its anchor id", () => {
    // GIVEN a relation id
    // WHEN building its anchor id and recovering the relation id from it
    // THEN the original relation id comes back
    expect(relationIdFromAnchorId(relationAnchorId("relation-1"))).toBe("relation-1");
  });

  it("returns null for a node id that isn't a relation anchor", () => {
    // GIVEN a plain element or annotation node id
    // WHEN checking whether it's a relation anchor
    // THEN it is not
    expect(relationIdFromAnchorId("element-1")).toBeNull();
    expect(relationIdFromAnchorId("annotation-1")).toBeNull();
  });
});

describe("toRelationAnchorNodes", () => {
  it("positions an anchor at the midpoint of its relation's two elements", () => {
    // GIVEN two elements 200 apart and a relation between them
    const elements = [elementNode("element-1", 0, 0), elementNode("element-2", 200, 100)];
    const edges = [relationEdge("relation-1", "element-1", "element-2")];

    // WHEN building the relation anchors
    const [anchor] = toRelationAnchorNodes(elements, edges);

    // THEN the anchor sits at the simple center-to-center average
    expect(anchor.id).toBe("relation-anchor-relation-1");
    expect(anchor.position).toEqual({ x: 100, y: 50 });
  });

  it("builds one anchor per relation, independently", () => {
    // GIVEN three elements and two relations among them
    const elements = [elementNode("element-1", 0, 0), elementNode("element-2", 100, 0), elementNode("element-3", 200, 0)];
    const edges = [relationEdge("relation-1", "element-1", "element-2"), relationEdge("relation-2", "element-2", "element-3")];

    // WHEN building the relation anchors
    const anchors = toRelationAnchorNodes(elements, edges);

    // THEN each relation gets its own anchor node
    expect(anchors.map((a) => a.id)).toEqual(["relation-anchor-relation-1", "relation-anchor-relation-2"]);
  });

  it("is not draggable or selectable", () => {
    // GIVEN a relation between two elements
    const elements = [elementNode("element-1", 0, 0), elementNode("element-2", 100, 100)];
    const edges = [relationEdge("relation-1", "element-1", "element-2")];

    // WHEN building the relation anchor
    const [anchor] = toRelationAnchorNodes(elements, edges);

    // THEN it's excluded from dragging and selection
    expect(anchor.draggable).toBe(false);
    expect(anchor.selectable).toBe(false);
  });

  it("skips a relation whose source or target element position is unknown", () => {
    // GIVEN a relation referencing an element that isn't in the given node list
    const elements = [elementNode("element-1", 0, 0)];
    const edges = [relationEdge("relation-1", "element-1", "element-2")];

    // WHEN building the relation anchors
    // THEN no anchor is built for it (rather than crashing on the missing position)
    expect(toRelationAnchorNodes(elements, edges)).toEqual([]);
  });

  it("returns an empty list for no relations", () => {
    // GIVEN elements but no relations
    // WHEN building the relation anchors
    // THEN there are none
    expect(toRelationAnchorNodes([elementNode("element-1", 0, 0)], [])).toEqual([]);
  });
});

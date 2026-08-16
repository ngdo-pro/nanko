import type { Connection } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { annotationLinkEdgeId, resolveAnnotationConnection, toAnnotationLinkEdges, toLinkPayload } from "./annotationLinks";
import type { AnnotationNode, AnnotationNodeLink } from "./toAnnotationNodes";

function annotationNode(id: string, links: AnnotationNodeLink[] = []): AnnotationNode {
  return {
    id,
    type: "annotation",
    position: { x: 0, y: 0 },
    data: { authorName: "Nicolas", body: "note", links },
  };
}

function link(overrides: Partial<AnnotationNodeLink> = {}): AnnotationNodeLink {
  return {
    id: "link-1",
    elementId: null,
    relationId: null,
    targetAnnotationId: null,
    sourceHandle: "bottom",
    targetHandle: "top",
    ...overrides,
  };
}

function connection(overrides: Partial<Connection> = {}): Connection {
  return { source: "annotation-1", target: "element-1", sourceHandle: null, targetHandle: null, ...overrides };
}

describe("resolveAnnotationConnection", () => {
  it("appends a note-to-element link", () => {
    // GIVEN a note dragged onto an element
    const resolution = resolveAnnotationConnection(connection({ source: "annotation-1", target: "element-1" }), [annotationNode("annotation-1")]);

    // THEN it resolves to appending an element link
    expect(resolution).toEqual({ kind: "append", annotationId: "annotation-1", link: { element_id: "element-1", source_handle: null, target_handle: null } });
  });

  it("appends a note-to-note link", () => {
    // GIVEN a note dragged onto another note
    const resolution = resolveAnnotationConnection(connection({ source: "annotation-1", target: "annotation-2" }), [
      annotationNode("annotation-1"),
      annotationNode("annotation-2"),
    ]);

    // THEN it resolves to appending a target-annotation link
    expect(resolution).toEqual({
      kind: "append",
      annotationId: "annotation-1",
      link: { target_annotation_id: "annotation-2", source_handle: null, target_handle: null },
    });
  });

  it("appends a note-to-relation link when the target is a relation anchor", () => {
    // GIVEN a note dragged onto a relation's synthetic anchor node
    const resolution = resolveAnnotationConnection(connection({ source: "annotation-1", target: "relation-anchor-relation-1", targetHandle: "center" }), [
      annotationNode("annotation-1"),
    ]);

    // THEN it resolves to appending a relation link, recovering the relation id from the anchor node id
    expect(resolution).toEqual({
      kind: "append",
      annotationId: "annotation-1",
      link: { relation_id: "relation-1", source_handle: null, target_handle: "center" },
    });
  });

  it("carries the dragged source/target handles onto the appended link", () => {
    // GIVEN a note dragged from its right edge onto an element's left edge
    const resolution = resolveAnnotationConnection(
      connection({ source: "annotation-1", target: "element-1", sourceHandle: "right", targetHandle: "left" }),
      [annotationNode("annotation-1")],
    );

    // THEN the chosen handles are preserved on the link
    expect(resolution).toEqual({
      kind: "append",
      annotationId: "annotation-1",
      link: { element_id: "element-1", source_handle: "right", target_handle: "left" },
    });
  });

  it("rejects an element-sourced drag onto a note", () => {
    // GIVEN a drag from an element onto a note — notes only ever point outward
    const resolution = resolveAnnotationConnection(connection({ source: "element-1", target: "annotation-1" }), [annotationNode("annotation-1")]);

    // THEN it is rejected outright
    expect(resolution).toEqual({ kind: "reject" });
  });

  it("rejects a relation-anchor-sourced drag onto a note", () => {
    // GIVEN a drag from a relation's synthetic anchor onto a note
    const resolution = resolveAnnotationConnection(connection({ source: "relation-anchor-relation-1", target: "annotation-1" }), [
      annotationNode("annotation-1"),
    ]);

    // THEN it is rejected outright, same as an element-sourced drag
    expect(resolution).toEqual({ kind: "reject" });
  });

  it("rejects an element-sourced drag onto a relation anchor", () => {
    // GIVEN a drag from one element onto another relation's anchor — anchors
    // never receive links except from a note
    const resolution = resolveAnnotationConnection(connection({ source: "element-1", target: "relation-anchor-relation-1" }), []);

    // THEN it is rejected outright
    expect(resolution).toEqual({ kind: "reject" });
  });

  it("resolves an element-to-element drag as a relation, unaffected by annotation handling", () => {
    // GIVEN a plain drag between two elements (no notes involved)
    const resolution = resolveAnnotationConnection(connection({ source: "element-1", target: "element-2" }), []);

    // THEN it is left for the caller to create a relation
    expect(resolution).toEqual({ kind: "relation" });
  });

  it("rejects a note dragged onto itself", () => {
    // GIVEN a note's handle dragged back onto itself
    const resolution = resolveAnnotationConnection(connection({ source: "annotation-1", target: "annotation-1" }), [annotationNode("annotation-1")]);

    // THEN it is rejected — defense in depth alongside the backend's own check
    expect(resolution).toEqual({ kind: "reject" });
  });

  it("silently dedupes a re-dragged existing element link", () => {
    // GIVEN a note already linked to an element
    const existing = link({ id: "link-1", elementId: "element-1" });
    const resolution = resolveAnnotationConnection(connection({ source: "annotation-1", target: "element-1" }), [
      annotationNode("annotation-1", [existing]),
    ]);

    // WHEN the same target is dragged again
    // THEN it is a silent no-op, not an error and not a duplicate append
    expect(resolution).toEqual({ kind: "noop" });
  });

  it("silently dedupes a re-dragged existing link regardless of the handle used", () => {
    // GIVEN a note already linked to an element from its bottom edge
    const existing = link({ id: "link-1", elementId: "element-1", sourceHandle: "bottom", targetHandle: "top" });
    // WHEN the same element is dragged again from a different edge
    const resolution = resolveAnnotationConnection(
      connection({ source: "annotation-1", target: "element-1", sourceHandle: "right", targetHandle: "left" }),
      [annotationNode("annotation-1", [existing])],
    );

    // THEN it is still deduped — the dedupe key is the target, not the anchor
    expect(resolution).toEqual({ kind: "noop" });
  });

  it("appends a second, distinct element link without touching the first", () => {
    // GIVEN a note already linked to one element
    const existing = link({ id: "link-1", elementId: "element-1" });
    // WHEN it is dragged onto a different element
    const resolution = resolveAnnotationConnection(connection({ source: "annotation-1", target: "element-2" }), [
      annotationNode("annotation-1", [existing]),
    ]);

    // THEN the new link is appended
    expect(resolution).toEqual({ kind: "append", annotationId: "annotation-1", link: { element_id: "element-2", source_handle: null, target_handle: null } });
  });
});

describe("toAnnotationLinkEdges", () => {
  it("fans out multiple curved edges from one note", () => {
    // GIVEN a note linked to two elements
    const nodes = [
      annotationNode("annotation-1", [link({ id: "link-1", elementId: "element-1" }), link({ id: "link-2", elementId: "element-2" })]),
    ];

    // WHEN building the decorative link edges
    const result = toAnnotationLinkEdges(nodes);

    // THEN one edge is built per link, each targeting its own element
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.target)).toEqual(["element-1", "element-2"]);
    expect(result.map((e) => e.id)).toEqual([annotationLinkEdgeId("annotation-1", "link-1"), annotationLinkEdgeId("annotation-1", "link-2")]);
  });

  it("builds a note-to-note edge", () => {
    // GIVEN a note linked to another note
    const nodes = [annotationNode("annotation-1", [link({ id: "link-1", targetAnnotationId: "annotation-2" })])];

    // WHEN building the decorative link edges
    const [edge] = toAnnotationLinkEdges(nodes);

    // THEN the edge targets the other note directly
    expect(edge.source).toBe("annotation-1");
    expect(edge.target).toBe("annotation-2");
  });

  it("builds a note-to-relation-anchor edge", () => {
    // GIVEN a note linked to a relation
    const nodes = [annotationNode("annotation-1", [link({ id: "link-1", relationId: "relation-1" })])];

    // WHEN building the decorative link edges
    const [edge] = toAnnotationLinkEdges(nodes);

    // THEN the edge targets the relation's synthetic anchor node
    expect(edge.target).toBe("relation-anchor-relation-1");
  });

  it("builds no edges for a note with no links", () => {
    // GIVEN a note with no links
    const nodes = [annotationNode("annotation-1", [])];

    // WHEN building the decorative link edges
    // THEN there are none
    expect(toAnnotationLinkEdges(nodes)).toEqual([]);
  });
});

describe("toLinkPayload", () => {
  it("drops the client-side id and keeps only the set target field", () => {
    // GIVEN one link of each target kind
    const links = [
      link({ id: "link-1", elementId: "element-1", sourceHandle: "right", targetHandle: "left" }),
      link({ id: "link-2", relationId: "relation-1" }),
      link({ id: "link-3", targetAnnotationId: "annotation-2" }),
    ];

    // WHEN converting to the write-side payload
    const payload = toLinkPayload(links);

    // THEN each entry carries only its own target field, no id, no other null keys
    expect(payload).toEqual([
      { element_id: "element-1", source_handle: "right", target_handle: "left" },
      { relation_id: "relation-1", source_handle: "bottom", target_handle: "top" },
      { target_annotation_id: "annotation-2", source_handle: "bottom", target_handle: "top" },
    ]);
  });

  it("returns an empty array for no links", () => {
    // GIVEN no links
    // WHEN converting to the write-side payload
    // THEN the result is empty
    expect(toLinkPayload([])).toEqual([]);
  });
});

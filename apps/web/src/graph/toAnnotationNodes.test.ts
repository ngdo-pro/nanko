import { describe, expect, it } from "vitest";
import type { Annotation, AnnotationLink } from "../api";
import { toAnnotationNodes } from "./toAnnotationNodes";

function annotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "annotation-1",
    project_id: "project-1",
    scope_element_id: null,
    x: 10,
    y: 20,
    author_name: "Nicolas",
    body: "Needs a data owner",
    links: [],
    created_at: "2026-08-13T00:00:00+00:00",
    updated_at: "2026-08-13T00:00:00+00:00",
    ...overrides,
  };
}

function link(overrides: Partial<AnnotationLink> = {}): AnnotationLink {
  return {
    id: "link-1",
    element_id: null,
    relation_id: null,
    target_annotation_id: null,
    source_handle: null,
    target_handle: null,
    ...overrides,
  };
}

describe("toAnnotationNodes", () => {
  it("maps an annotation to a positioned node of type annotation", () => {
    // GIVEN one annotation with no links
    const nodes = toAnnotationNodes([annotation()]);

    // WHEN mapping it to a React Flow node
    // THEN it carries the annotation's id, position, and type
    expect(nodes).toEqual([
      {
        id: "annotation-1",
        type: "annotation",
        position: { x: 10, y: 20 },
        data: {
          authorName: "Nicolas",
          body: "Needs a data owner",
          links: [],
        },
      },
    ]);
  });

  it("defaults a link's anchor to bottom/top when the link has none stored", () => {
    // GIVEN an annotation linked to an element but predating the anchor feature
    const nodes = toAnnotationNodes([annotation({ links: [link({ element_id: "system-1", source_handle: null, target_handle: null })] })]);

    // WHEN mapping it
    // THEN it renders exactly as it always did, so no existing link re-anchors on deploy
    expect(nodes[0].data.links[0].sourceHandle).toBe("bottom");
    expect(nodes[0].data.links[0].targetHandle).toBe("top");
  });

  it("carries an explicit stored anchor onto the link data", () => {
    // GIVEN an annotation linked to an element, anchored from its right edge to the element's center
    const nodes = toAnnotationNodes([annotation({ links: [link({ element_id: "system-1", source_handle: "right", target_handle: "center" })] })]);

    // WHEN mapping it
    // THEN the stored anchor is used as-is
    expect(nodes[0].data.links[0].sourceHandle).toBe("right");
    expect(nodes[0].data.links[0].targetHandle).toBe("center");
  });

  it("carries an element link through to the node data", () => {
    // GIVEN an annotation linked to an element
    const nodes = toAnnotationNodes([annotation({ links: [link({ id: "link-1", element_id: "system-1" })] })]);

    // WHEN mapping it
    // THEN the link is preserved on the node's data
    expect(nodes[0].data.links).toEqual([
      { id: "link-1", elementId: "system-1", relationId: null, targetAnnotationId: null, sourceHandle: "bottom", targetHandle: "top" },
    ]);
  });

  it("carries multiple links through to the node data, independently", () => {
    // GIVEN an annotation linked to two elements and another note
    const nodes = toAnnotationNodes([
      annotation({
        links: [
          link({ id: "link-1", element_id: "system-1" }),
          link({ id: "link-2", element_id: "system-2" }),
          link({ id: "link-3", target_annotation_id: "annotation-2" }),
        ],
      }),
    ]);

    // WHEN mapping it
    // THEN all three links are preserved, each with its own target
    expect(nodes[0].data.links).toHaveLength(3);
    expect(nodes[0].data.links.map((l) => l.elementId)).toEqual(["system-1", "system-2", null]);
    expect(nodes[0].data.links[2].targetAnnotationId).toBe("annotation-2");
  });

  it("carries a relation link through to the node data", () => {
    // GIVEN an annotation linked to a relation
    const nodes = toAnnotationNodes([annotation({ links: [link({ id: "link-1", relation_id: "relation-1" })] })]);

    // WHEN mapping it
    // THEN the relation link is preserved, distinct from an element/note link
    expect(nodes[0].data.links[0].relationId).toBe("relation-1");
    expect(nodes[0].data.links[0].elementId).toBeNull();
    expect(nodes[0].data.links[0].targetAnnotationId).toBeNull();
  });

  it("carries a note-to-note link through to the node data", () => {
    // GIVEN an annotation linked to another note
    const nodes = toAnnotationNodes([annotation({ links: [link({ id: "link-1", target_annotation_id: "annotation-2" })] })]);

    // WHEN mapping it
    // THEN the note-to-note link is preserved
    expect(nodes[0].data.links[0].targetAnnotationId).toBe("annotation-2");
  });

  it("maps multiple annotations independently", () => {
    // GIVEN two annotations at different positions
    const nodes = toAnnotationNodes([annotation({ id: "a1", x: 0, y: 0 }), annotation({ id: "a2", x: 100, y: 200 })]);

    // WHEN mapping them
    // THEN both appear with their own id and position
    expect(nodes.map((n) => n.id)).toEqual(["a1", "a2"]);
    expect(nodes[1].position).toEqual({ x: 100, y: 200 });
  });

  it("returns an empty list for no annotations", () => {
    // GIVEN no annotations
    // WHEN mapping them
    // THEN the result is empty
    expect(toAnnotationNodes([])).toEqual([]);
  });
});

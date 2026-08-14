import { describe, expect, it } from "vitest";
import type { Annotation } from "../api";
import { toAnnotationNodes } from "./toAnnotationNodes";

function annotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "annotation-1",
    project_id: "project-1",
    element_id: null,
    relation_id: null,
    scope_element_id: null,
    x: 10,
    y: 20,
    author_name: "Nicolas",
    body: "Needs a data owner",
    created_at: "2026-08-13T00:00:00+00:00",
    updated_at: "2026-08-13T00:00:00+00:00",
    ...overrides,
  };
}

describe("toAnnotationNodes", () => {
  it("maps an annotation to a positioned node of type annotation", () => {
    // GIVEN one annotation
    const nodes = toAnnotationNodes([annotation()]);

    // WHEN mapping it to a React Flow node
    // THEN it carries the annotation's id, position, and type
    expect(nodes).toEqual([
      {
        id: "annotation-1",
        type: "annotation",
        position: { x: 10, y: 20 },
        data: { authorName: "Nicolas", body: "Needs a data owner", elementId: null, relationId: null },
      },
    ]);
  });

  it("carries an element link through to the node data", () => {
    // GIVEN an annotation linked to an element
    const nodes = toAnnotationNodes([annotation({ element_id: "system-1" })]);

    // WHEN mapping it
    // THEN the link is preserved on the node's data
    expect(nodes[0].data.elementId).toBe("system-1");
    expect(nodes[0].data.relationId).toBeNull();
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

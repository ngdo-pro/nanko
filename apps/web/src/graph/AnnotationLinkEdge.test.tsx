import { getBezierPath, getStraightPath, Position, ReactFlowProvider } from "@xyflow/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnnotationLinkEdge, type AnnotationLinkEdgeData } from "./AnnotationLinkEdge";

function renderEdge(overrides: Partial<AnnotationLinkEdgeData> = {}) {
  const data: AnnotationLinkEdgeData = {
    sourceHandle: "bottom",
    targetHandle: "top",
    ...overrides,
  };

  const { container } = render(
    <ReactFlowProvider>
      <svg>
        <AnnotationLinkEdge
          id="annotation-link-annotation-1-link-1"
          source="annotation-1"
          target="element-1"
          data={data}
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={Position.Bottom}
          targetPosition={Position.Top}
        />
      </svg>
    </ReactFlowProvider>,
  );

  return container.querySelector(".react-flow__edge-path") as SVGPathElement;
}

describe("AnnotationLinkEdge", () => {
  const GEOMETRY = { sourceX: 0, sourceY: 0, targetX: 100, targetY: 100 };
  const [straightPath] = getStraightPath(GEOMETRY);
  const [bezierPath] = getBezierPath({ ...GEOMETRY, sourcePosition: Position.Bottom, targetPosition: Position.Top });

  it("draws the bezier curve when neither end is center-anchored, matching RelationEdge", () => {
    // GIVEN a note-to-element link anchored bottom-to-top, as note links always used to render
    const path = renderEdge({ sourceHandle: "bottom", targetHandle: "top" });

    // THEN the path curves, no longer a straight line
    expect(path.getAttribute("d")).toBe(bezierPath);
    expect(path.getAttribute("d")).not.toBe(straightPath);
  });

  it("draws a straight line when the source is center-anchored", () => {
    // GIVEN a link anchored at the note's center — no real side, so no bezier
    // control point direction describes it (same reasoning as RelationEdge)
    const path = renderEdge({ sourceHandle: "center", targetHandle: "top" });

    // THEN the path is a straight line, not the (wrongly directional) bezier curve
    expect(path.getAttribute("d")).toBe(straightPath);
  });

  it("draws a straight line when the target is center-anchored", () => {
    // GIVEN a link anchored at the target's center (e.g. a note linked to a relation anchor)
    const path = renderEdge({ sourceHandle: "bottom", targetHandle: "center" });

    // THEN the path is a straight line
    expect(path.getAttribute("d")).toBe(straightPath);
  });

  it("renders the decorative dashed style", () => {
    // GIVEN a standard note link
    const path = renderEdge();

    // WHEN it renders
    // THEN it's dashed, in the note-border color — decorative, not a real relation
    expect(path.getAttribute("style")).toContain("stroke: var(--note-border)");
    expect(path.getAttribute("style")).toContain("stroke-dasharray: 4 4");
  });
});

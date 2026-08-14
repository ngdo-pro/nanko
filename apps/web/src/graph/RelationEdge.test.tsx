import { Position, ReactFlowProvider } from "@xyflow/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelationEdge } from "./RelationEdge";
import type { RelationEdgeData } from "./toFlowGraph";

function renderEdge(overrides: Partial<RelationEdgeData> = {}, selected = false) {
  const data: RelationEdgeData = {
    label: null,
    technology: null,
    status: "declared",
    isUnrealized: false,
    ...overrides,
  };

  const { container } = render(
    <ReactFlowProvider>
      <svg>
        <RelationEdge
          id="relation-1"
          source="system-1"
          target="system-2"
          data={data}
          selected={selected}
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

  return { path: container.querySelector(".react-flow__edge-path") as SVGPathElement, container };
}

function renderEdgePath(overrides: Partial<RelationEdgeData> = {}, selected = false) {
  return renderEdge(overrides, selected).path;
}

describe("RelationEdge", () => {
  it("renders a declared relation as a solid line", () => {
    // GIVEN a declared, realized relation
    const path = renderEdgePath({ status: "declared", isUnrealized: false });

    // WHEN the edge renders
    // THEN it draws a thin solid line
    expect(path.getAttribute("style")).toContain("stroke-width: 1.5");
    expect(path.getAttribute("style")).not.toContain("stroke-dasharray");
  });

  it("renders a derived relation as a thicker accent-colored line", () => {
    // GIVEN a derived relation
    const path = renderEdgePath({ status: "derived", isUnrealized: false });

    // WHEN the edge renders
    // THEN it draws a thicker line in the accent color
    expect(path.getAttribute("style")).toContain("stroke: var(--accent)");
    expect(path.getAttribute("style")).toContain("stroke-width: 2");
  });

  it("renders an unrealized declared relation as a dashed warning-colored line", () => {
    // GIVEN a declared relation flagged as unrealized
    const path = renderEdgePath({ status: "declared", isUnrealized: true });

    // WHEN the edge renders
    // THEN it draws a dashed line in the warning color, regardless of derived/declared status
    expect(path.getAttribute("style")).toContain("stroke: var(--warning)");
    expect(path.getAttribute("style")).toContain("stroke-dasharray: 5 4");
  });

  it("thickens the line when selected, without overriding its status color", () => {
    // GIVEN an unrealized relation that is selected
    const path = renderEdgePath({ status: "declared", isUnrealized: true }, true);

    // WHEN the edge renders
    // THEN it is thicker, but keeps the warning color so the status stays legible
    expect(path.getAttribute("style")).toContain("stroke-width: 3");
    expect(path.getAttribute("style")).toContain("stroke: var(--warning)");
  });

  it("draws a solid line in the added color", () => {
    // GIVEN a relation added between the two compared milestones
    const { path } = renderEdge({ diffStatus: "added" });

    // WHEN the edge renders
    // THEN it draws a solid line in the "added" color
    expect(path.getAttribute("style")).toContain("stroke: var(--diff-added)");
    expect(path.getAttribute("style")).not.toContain("stroke-dasharray");
  });

  it("draws a dotted line in the modified color", () => {
    // GIVEN a relabeled relation, present in a comparison
    const { path } = renderEdge({ diffStatus: "modified", label: "calls" });

    // WHEN the edge renders
    // THEN it draws a dotted line in the "modified" color
    expect(path.getAttribute("style")).toContain("stroke: var(--diff-modified)");
    expect(path.getAttribute("style")).toContain("stroke-dasharray: 2 3");
  });

  it("draws a dashed line in the removed color", () => {
    // GIVEN a relation removed between the two compared milestones
    const { path } = renderEdge({ diffStatus: "removed" });

    // WHEN the edge renders
    // THEN it draws a dashed line in the "removed" color
    expect(path.getAttribute("style")).toContain("stroke: var(--diff-removed)");
    expect(path.getAttribute("style")).toContain("stroke-dasharray: 6 4");
  });

  it("ignores the unrealized/derived styling once a diff status is set", () => {
    // GIVEN a derived, unrealized relation that is also flagged as modified in a comparison
    const { path } = renderEdge({ diffStatus: "modified", status: "derived", isUnrealized: true, label: "calls" });

    // WHEN the edge renders
    // THEN the diff color/style wins — one signal, not diff competing with unrealized/derived
    expect(path.getAttribute("style")).toContain("stroke: var(--diff-modified)");
    expect(path.getAttribute("style")).not.toContain("var(--warning)");
    expect(path.getAttribute("style")).not.toContain("var(--accent)");
  });

  it("draws a plain line for an unchanged relation in a comparison", () => {
    // GIVEN a relation present identically at both compared milestones
    const { path } = renderEdge({ diffStatus: "unchanged", label: "calls" });

    // WHEN the edge renders
    // THEN it looks like a normal declared relation
    expect(path.getAttribute("style")).toContain("stroke: var(--text)");
  });
});

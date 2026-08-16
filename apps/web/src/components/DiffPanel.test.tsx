import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ElementNode, ElementNodeData, RelationEdge, RelationEdgeData } from "../graph/toFlowGraph";
import { DiffPanel } from "./DiffPanel";

function node(id: string, dataOverrides: Partial<ElementNodeData> = {}): ElementNode {
  const data: ElementNodeData = {
    label: "Booking",
    description: null,
    technology: null,
    isExternal: false,
    archetype: null,
    diffStatus: "unchanged",
    ...dataOverrides,
  };

  return { id, type: "element", position: { x: 0, y: 0 }, data };
}

function edge(id: string, source: string, target: string, dataOverrides: Partial<RelationEdgeData> = {}): RelationEdge {
  const data: RelationEdgeData = {
    label: null,
    technology: null,
    status: "declared",
    isUnrealized: false,
    sourceHandle: "bottom",
    targetHandle: "top",
    diffStatus: "unchanged",
    ...dataOverrides,
  };

  return { id, type: "relation", source, target, data };
}

describe("DiffPanel", () => {
  it("shows a message when there are no differences", () => {
    // GIVEN only unchanged elements and relations
    render(<DiffPanel nodes={[node("e1", { diffStatus: "unchanged" })]} edges={[]} />);

    // WHEN the panel renders
    // THEN it explains there is nothing to show
    expect(screen.getByTestId("diff-panel-empty")).toBeInTheDocument();
  });

  it("lists an added element under the added section", () => {
    // GIVEN an added element
    render(<DiffPanel nodes={[node("e1", { label: "Analytics", diffStatus: "added" })]} edges={[]} />);

    // WHEN the panel renders
    // THEN it appears under "Added"
    expect(screen.getByTestId("diff-panel-section-added")).toHaveTextContent("Analytics");
  });

  it("shows the changed fields for a modified element", () => {
    // GIVEN a modified element with a name and technology change
    render(<DiffPanel nodes={[node("e1", { label: "Notifications", diffStatus: "modified", changedFields: ["name", "technology"] })]} edges={[]} />);

    // WHEN the panel renders
    // THEN the item lists which fields changed
    expect(screen.getByTestId("diff-panel-section-modified")).toHaveTextContent("Notifications — name, technology");
  });

  it("does not list an unchanged element in any section", () => {
    // GIVEN a mix of one added and one unchanged element
    render(
      <DiffPanel
        nodes={[node("e1", { label: "Analytics", diffStatus: "added" }), node("e2", { label: "Booking", diffStatus: "unchanged" })]}
        edges={[]}
      />,
    );

    // WHEN the panel renders
    // THEN only the added element is listed, the unchanged one is not shown anywhere
    expect(screen.queryByText("Booking")).not.toBeInTheDocument();
  });

  it("labels a relation using its endpoints' names, resolved from the node list", () => {
    // GIVEN a removed relation between two known elements
    render(
      <DiffPanel
        nodes={[node("system-1", { label: "Booking" }), node("system-2", { label: "Payments" })]}
        edges={[edge("r1", "system-1", "system-2", { diffStatus: "removed" })]}
      />,
    );

    // WHEN the panel renders
    // THEN the relation is described by its endpoints' names
    expect(screen.getByTestId("diff-panel-section-removed")).toHaveTextContent("Booking → Payments");
  });

  it("includes the relation's own label when it has one", () => {
    // GIVEN a modified, labeled relation
    render(
      <DiffPanel
        nodes={[node("system-1", { label: "Booking" }), node("system-2", { label: "Payments" })]}
        edges={[edge("r1", "system-1", "system-2", { label: "calls sync", diffStatus: "modified", changedFields: ["label"] })]}
      />,
    );

    // WHEN the panel renders
    // THEN the relation's own label and its changed fields are both shown
    const section = screen.getByTestId("diff-panel-section-modified");
    expect(section).toHaveTextContent("Booking → Payments: calls sync — label");
  });

  it("groups multiple items of the same status together, with a count", () => {
    // GIVEN two added elements
    render(
      <DiffPanel nodes={[node("e1", { label: "Analytics", diffStatus: "added" }), node("e2", { label: "Notifications", diffStatus: "added" })]} edges={[]} />,
    );

    // WHEN the panel renders
    // THEN both appear under a single "Added" section, with a count of 2
    const items = screen.getAllByTestId("diff-panel-item");
    expect(items).toHaveLength(2);
    expect(screen.getByTestId("diff-panel-section-added")).toHaveTextContent("(2)");
  });
});

import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ElementNode } from "./ElementNode";
import type { ElementNodeData } from "./toFlowGraph";

function renderNode(overrides: Partial<ElementNodeData> = {}, selected = false) {
  const data: ElementNodeData = {
    label: "Booking",
    description: null,
    technology: null,
    isExternal: false,
    archetype: null,
    ...overrides,
  };

  return render(
    <ReactFlowProvider>
      <ElementNode
        id="element-1"
        type="element"
        data={data}
        selected={selected}
        selectable
        deletable
        draggable
        isConnectable
        zIndex={0}
        dragging={false}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
      />
    </ReactFlowProvider>,
  );
}

describe("ElementNode", () => {
  it("renders the element name", () => {
    // GIVEN an element with a name
    renderNode({ label: "Booking" });

    // WHEN the node renders
    // THEN the name is shown
    expect(screen.getByText("Booking")).toBeInTheDocument();
  });

  it("renders the description when present", () => {
    // GIVEN an element with a description
    renderNode({ description: "Handles bookings" });

    // WHEN the node renders
    // THEN the description is shown
    expect(screen.getByText("Handles bookings")).toBeInTheDocument();
  });

  it("does not render a description when absent", () => {
    // GIVEN an element with no description, technology, or external flag
    const { container } = renderNode({ description: null, technology: null, isExternal: false });

    // WHEN the node renders
    // THEN no empty description or badge element is left behind
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("renders the technology as a badge", () => {
    // GIVEN an element with a technology
    renderNode({ technology: "Node.js" });

    // WHEN the node renders
    // THEN the technology badge is shown
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("renders an External badge and a dashed border for external elements", () => {
    // GIVEN an external element
    renderNode({ isExternal: true });

    // WHEN the node renders
    // THEN it shows an External badge with a dashed border
    expect(screen.getByText("External")).toBeInTheDocument();
    expect(screen.getByTestId("element-node").getAttribute("style")).toContain("dashed");
  });

  it("uses a solid border for non-external elements", () => {
    // GIVEN a non-external element
    renderNode({ isExternal: false });

    // WHEN the node renders
    // THEN it shows a solid border and no External badge
    expect(screen.queryByText("External")).not.toBeInTheDocument();
    expect(screen.getByTestId("element-node").getAttribute("style")).toContain("solid");
  });

  it("highlights the border in the accent color when selected", () => {
    // GIVEN a selected element
    renderNode({}, true);

    // WHEN the node renders
    // THEN its border uses the accent color
    expect(screen.getByTestId("element-node").getAttribute("style")).toContain("var(--accent)");
  });

  it("uses the default border color when not selected", () => {
    // GIVEN an unselected element
    renderNode({}, false);

    // WHEN the node renders
    // THEN its border does not use the accent color
    expect(screen.getByTestId("element-node").getAttribute("style")).not.toContain("var(--accent)");
  });

  it("renders a database icon, using the same plain box as any other element", () => {
    // GIVEN a container tagged as a database
    renderNode({ archetype: "database" });

    // WHEN the node renders
    // THEN it shows the database icon, on the standard rounded-box shape (no custom silhouette)
    expect(screen.getByTestId("element-node-archetype-icon")).toBeInTheDocument();
    expect(screen.getByTestId("element-node").getAttribute("style")).toContain("border-radius: 10px");
  });

  it("renders a queue icon, using the same plain box as any other element", () => {
    // GIVEN a container tagged as a queue
    renderNode({ archetype: "queue" });

    // WHEN the node renders
    // THEN it shows the queue icon, on the standard rounded-box shape (no custom silhouette)
    expect(screen.getByTestId("element-node-archetype-icon")).toBeInTheDocument();
    expect(screen.getByTestId("element-node").getAttribute("style")).toContain("border-radius: 10px");
  });

  it("renders no archetype icon when unset", () => {
    // GIVEN an element with no archetype (the default/service look)
    renderNode({ archetype: null });

    // WHEN the node renders
    // THEN no archetype icon is shown
    expect(screen.queryByTestId("element-node-archetype-icon")).not.toBeInTheDocument();
    expect(screen.getByTestId("element-node").getAttribute("style")).toContain("border-radius: 10px");
  });

  it("tints the database icon with the technology's brand color when recognized", () => {
    // GIVEN a database container using a technology with a known brand color
    renderNode({ archetype: "database", technology: "MongoDB" });

    // WHEN the node renders
    // THEN the icon uses the brand color instead of the default text color
    const icon = screen.getByTestId("element-node-archetype-icon");
    expect(icon.getAttribute("style")).toContain("color: rgb(71, 162, 72)");
  });

  it("colors the left border with the technology's brand color when recognized", () => {
    // GIVEN an element using a technology with a known brand color
    renderNode({ technology: "MongoDB" });

    // WHEN the node renders
    // THEN the left border is thicker and tinted, distinct from the other three sides
    const style = screen.getByTestId("element-node").getAttribute("style") ?? "";
    // jsdom normalizes hex colors to rgb() when serializing style attributes.
    expect(style).toContain("border-left: 4px solid rgb(71, 162, 72)");
    expect(style).toContain("border-top: 1.5px solid var(--border)");
  });

  it("does not tint the left border for an unrecognized technology", () => {
    // GIVEN an element using a technology with no known brand color
    renderNode({ technology: "SomeInHouseFramework" });

    // WHEN the node renders
    // THEN all four sides share the same plain border
    const node = screen.getByTestId("element-node");
    expect(node.style.borderLeft).toBe(node.style.borderTop);
  });

  it("renders no diff badge when diffStatus is unset", () => {
    // GIVEN an element outside milestone comparison (the normal canvas)
    renderNode({});

    // WHEN the node renders
    // THEN no diff badge is shown
    expect(screen.queryByTestId("element-node-diff-badge")).not.toBeInTheDocument();
  });

  it("marks an added element with a solid green border and a + badge", () => {
    // GIVEN an element added between the two compared milestones
    renderNode({ diffStatus: "added" });

    // WHEN the node renders
    // THEN it shows a solid border in the "added" color and a "+" badge
    const style = screen.getByTestId("element-node").getAttribute("style") ?? "";
    expect(style).toContain("border-top: 1.5px solid var(--diff-added)");
    expect(screen.getByTestId("element-node-diff-badge")).toHaveTextContent("+");
  });

  it("marks a removed element with a dashed red border, a − badge, and reduced opacity", () => {
    // GIVEN an element removed between the two compared milestones
    renderNode({ diffStatus: "removed" });

    // WHEN the node renders
    // THEN it shows a dashed border in the "removed" color, a "−" badge, and fades to read as gone
    const node = screen.getByTestId("element-node");
    expect(node.getAttribute("style") ?? "").toContain("border-top: 1.5px dashed var(--diff-removed)");
    expect(screen.getByTestId("element-node-diff-badge")).toHaveTextContent("−");
    expect(node.style.opacity).toBe("0.6");
  });

  it("marks a modified element with a dotted blue border and a ~ badge", () => {
    // GIVEN an element modified between the two compared milestones
    renderNode({ diffStatus: "modified" });

    // WHEN the node renders
    // THEN it shows a dotted border in the "modified" color and a "~" badge
    const style = screen.getByTestId("element-node").getAttribute("style") ?? "";
    expect(style).toContain("border-top: 1.5px dotted var(--diff-modified)");
    expect(screen.getByTestId("element-node-diff-badge")).toHaveTextContent("~");
  });

  it("renders no diff badge for an unchanged element in a comparison", () => {
    // GIVEN an element present identically at both compared milestones
    renderNode({ diffStatus: "unchanged" });

    // WHEN the node renders
    // THEN it looks like a normal element, with no badge
    expect(screen.queryByTestId("element-node-diff-badge")).not.toBeInTheDocument();
  });

  it("lets the diff status override the technology brand color on the border", () => {
    // GIVEN a modified element with a recognized technology brand color
    renderNode({ diffStatus: "modified", technology: "MongoDB" });

    // WHEN the node renders
    // THEN the diff color wins on every side, including the left border that would otherwise be tinted
    const node = screen.getByTestId("element-node");
    expect(node.style.borderLeft).toBe(node.style.borderTop);
    expect(node.getAttribute("style") ?? "").toContain("var(--diff-modified)");
  });
});

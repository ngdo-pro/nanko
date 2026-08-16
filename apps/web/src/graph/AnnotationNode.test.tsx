import { ReactFlowProvider } from "@xyflow/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationNodeData } from "./toAnnotationNodes";
import { AnnotationNode } from "./AnnotationNode";

function renderNode(overrides: Partial<AnnotationNodeData> = {}, selected = false) {
  const data: AnnotationNodeData = {
    authorName: "Nicolas",
    body: "Needs a data owner",
    links: [],
    ...overrides,
  };

  return render(
    <ReactFlowProvider>
      <AnnotationNode
        id="annotation-1"
        type="annotation"
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

describe("AnnotationNode", () => {
  it("renders the note's body", () => {
    // GIVEN a note with a body
    renderNode({ body: "Needs a data owner" });

    // WHEN it renders
    // THEN the body text is shown
    expect(screen.getByText("Needs a data owner")).toBeInTheDocument();
  });

  it("renders the note's author", () => {
    // GIVEN a note with an author
    renderNode({ authorName: "Nicolas" });

    // WHEN it renders
    // THEN the author is shown
    expect(screen.getByText("— Nicolas")).toBeInTheDocument();
  });

  it("renders an editable textarea instead of static text when editing", () => {
    // GIVEN a note in editing mode
    renderNode({ body: "Needs a data owner", isEditing: true });

    // WHEN it renders
    // THEN the body is an editable field
    expect(screen.getByTestId("annotation-node-edit")).toHaveValue("Needs a data owner");
  });

  it("commits the edited text on blur", () => {
    // GIVEN a note in editing mode
    const onCommitEdit = vi.fn();
    renderNode({ body: "old text", isEditing: true, onCommitEdit });

    // WHEN the text is changed and the field loses focus
    fireEvent.change(screen.getByTestId("annotation-node-edit"), { target: { value: "new text" } });
    fireEvent.blur(screen.getByTestId("annotation-node-edit"));

    // THEN the new text is committed
    expect(onCommitEdit).toHaveBeenCalledWith("new text");
  });

  it("cancels editing on Escape without committing", () => {
    // GIVEN a note in editing mode
    const onCommitEdit = vi.fn();
    const onCancelEdit = vi.fn();
    renderNode({ body: "old text", isEditing: true, onCommitEdit, onCancelEdit });

    // WHEN Escape is pressed
    fireEvent.keyDown(screen.getByTestId("annotation-node-edit"), { key: "Escape" });

    // THEN editing is cancelled, nothing is committed
    expect(onCancelEdit).toHaveBeenCalled();
    expect(onCommitEdit).not.toHaveBeenCalled();
  });

  describe("relation anchors", () => {
    it("renders a target and a source handle at each of the 4 edges plus the center", () => {
      // GIVEN a standard note
      const { container } = renderNode();

      // WHEN it renders
      // THEN every anchor (top/right/bottom/left/center) has both a target and a source handle —
      // a note can point AT a target, and can itself receive a link dragged from another note
      for (const id of ["top", "right", "bottom", "left", "center"]) {
        const handles = container.querySelectorAll(`[data-handleid="${id}"]`);
        expect(handles).toHaveLength(2);
        const types = Array.from(handles).map((h) => (h.classList.contains("target") ? "target" : "source"));
        expect(types.sort()).toEqual(["source", "target"]);
      }
    });

    it("positions the 4 edge handles on their matching side", () => {
      // GIVEN a standard note
      const { container } = renderNode();

      // WHEN it renders
      // THEN each edge handle's xyflow position matches its id
      for (const position of ["top", "right", "bottom", "left"]) {
        const handles = container.querySelectorAll(`[data-handleid="${position}"]`);
        for (const handle of Array.from(handles)) {
          expect(handle.getAttribute("data-handlepos")).toBe(position);
        }
      }
    });

    it("keeps the center handle invisible but still hit-testable", () => {
      // GIVEN a standard note
      const { container } = renderNode();

      // WHEN it renders
      // THEN both center handles have zero opacity but are not removed from hit-testing
      const centerHandles = container.querySelectorAll('[data-handleid="center"]');
      expect(centerHandles).toHaveLength(2);
      for (const handle of Array.from(centerHandles)) {
        const style = (handle as HTMLElement).style;
        expect(style.opacity).toBe("0");
        expect(style.visibility).not.toBe("hidden");
        expect(style.display).not.toBe("none");
      }
    });
  });
});

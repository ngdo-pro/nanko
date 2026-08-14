import { ReactFlowProvider } from "@xyflow/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationNodeData } from "./toAnnotationNodes";
import { AnnotationNode } from "./AnnotationNode";

function renderNode(overrides: Partial<AnnotationNodeData> = {}, selected = false) {
  const data: AnnotationNodeData = {
    authorName: "Nicolas",
    body: "Needs a data owner",
    elementId: null,
    relationId: null,
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
});

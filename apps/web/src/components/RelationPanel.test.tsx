import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphRelation } from "../api";
import { RelationPanel } from "./RelationPanel";

function relation(overrides: Partial<GraphRelation> = {}): GraphRelation {
  return {
    id: "relation-1",
    source_element_id: "element-1",
    target_element_id: "element-2",
    status: "declared",
    label: null,
    technology: null,
    realized_at_milestone_id: null,
    ...overrides,
  };
}

describe("RelationPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the relation's current label and technology", () => {
    // GIVEN a relation with a label and technology
    render(
      <RelationPanel relation={relation({ label: "reads/writes", technology: "HTTP" })} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />,
    );

    // WHEN the panel renders
    // THEN each field shows the relation's current value
    expect(screen.getByTestId("relation-panel-label")).toHaveValue("reads/writes");
    expect(screen.getByTestId("relation-panel-technology")).toHaveValue("HTTP");
  });

  it("calls onSave with the new values after the debounce delay", async () => {
    // GIVEN a panel for a relation with no label yet
    const onSave = vi.fn();
    render(<RelationPanel relation={relation()} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the label is changed
    fireEvent.change(screen.getByTestId("relation-panel-label"), { target: { value: "reads/writes" } });

    // THEN onSave is not called immediately
    expect(onSave).not.toHaveBeenCalled();

    // AND it is called once the debounce delay has elapsed
    await vi.advanceTimersByTimeAsync(400);
    expect(onSave).toHaveBeenCalledWith("reads/writes", null);
  });

  it("saves null when a field is cleared, unlike the element panel's required name", async () => {
    // GIVEN a relation with a label
    const onSave = vi.fn();
    render(<RelationPanel relation={relation({ label: "reads/writes" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the label is cleared
    fireEvent.change(screen.getByTestId("relation-panel-label"), { target: { value: "  " } });
    await vi.advanceTimersByTimeAsync(400);

    // THEN the save still goes through, with a null label
    expect(onSave).toHaveBeenCalledWith(null, null);
  });

  it("keeps a pending edit when the relation prop is recreated with the same id", async () => {
    // GIVEN a panel mid-edit — the parent recreates the `relation` object on every
    // render, not just when a different relation is actually selected
    const onSave = vi.fn();
    const { rerender } = render(
      <RelationPanel relation={relation({ id: "relation-1" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByTestId("relation-panel-label"), { target: { value: "reads/writes" } });

    // WHEN the parent re-renders with a new object for the *same* relation, before the debounce fires
    await vi.advanceTimersByTimeAsync(100);
    rerender(<RelationPanel relation={relation({ id: "relation-1" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);
    await vi.advanceTimersByTimeAsync(400);

    // THEN the pending edit is still saved, not silently discarded
    expect(onSave).toHaveBeenCalledWith("reads/writes", null);
  });

  it("does not save when switching to a different relation", async () => {
    // GIVEN a panel showing one relation
    const onSave = vi.fn();
    const { rerender } = render(
      <RelationPanel relation={relation({ id: "relation-1", label: "first" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />,
    );

    // WHEN a different relation is selected (new props, not a user edit)
    rerender(<RelationPanel relation={relation({ id: "relation-2", label: "second" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);
    await vi.advanceTimersByTimeAsync(400);

    // THEN no save is triggered, and the form now shows the new relation's values
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("relation-panel-label")).toHaveValue("second");
  });

  it("requires a second click to confirm delete", async () => {
    // GIVEN a panel for a relation
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<RelationPanel relation={relation()} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);

    // WHEN the delete button is clicked once
    await user.click(screen.getByTestId("relation-panel-delete"));

    // THEN it asks for confirmation instead of deleting immediately
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId("relation-panel-delete")).toHaveTextContent("Confirm delete?");

    // WHEN it is clicked again
    await user.click(screen.getByTestId("relation-panel-delete"));

    // THEN the relation is deleted
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("offers known technology names as autocomplete suggestions", () => {
    // GIVEN a panel for a relation
    render(<RelationPanel relation={relation()} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the panel renders
    // THEN the technology input is linked to a datalist offering known technologies
    const input = screen.getByTestId("relation-panel-technology");
    const listId = input.getAttribute("list");
    expect(listId).toBeTruthy();
    const options = document.querySelectorAll(`#${listId} option`);
    expect(options.length).toBeGreaterThan(0);
    expect(Array.from(options).map((o) => o.getAttribute("value"))).toContain("Kafka");
  });

  it("calls onClose when the close button is clicked", async () => {
    // GIVEN a panel for a relation
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RelationPanel relation={relation()} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);

    // WHEN the close button is clicked
    await user.click(screen.getByTestId("relation-panel-close"));

    // THEN onClose is called
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

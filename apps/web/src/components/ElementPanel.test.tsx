import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphElement } from "../api";
import { ElementPanel } from "./ElementPanel";

function element(overrides: Partial<GraphElement> = {}): GraphElement {
  return {
    id: "element-1",
    project_id: "project-1",
    parent_id: null,
    kind: "system",
    is_external: false,
    archetype: null,
    name: "Booking",
    description: null,
    technology: null,
    ...overrides,
  };
}

describe("ElementPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the element's current name description and technology", () => {
    // GIVEN an element with all attributes set
    render(
      <ElementPanel
        element={element({ name: "Booking", description: "Handles bookings", technology: "Symfony" })}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // WHEN the panel renders
    // THEN each field shows the element's current value
    expect(screen.getByTestId("element-panel-name")).toHaveValue("Booking");
    expect(screen.getByTestId("element-panel-description")).toHaveValue("Handles bookings");
    expect(screen.getByTestId("element-panel-technology")).toHaveValue("Symfony");
  });

  it("calls onSave with the new values after the debounce delay", async () => {
    // GIVEN a panel for an element
    const onSave = vi.fn();
    render(<ElementPanel element={element({ name: "Booking" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the name is changed
    fireEvent.change(screen.getByTestId("element-panel-name"), { target: { value: "Payments" } });

    // THEN onSave is not called immediately
    expect(onSave).not.toHaveBeenCalled();

    // AND it is called once the debounce delay has elapsed
    await vi.advanceTimersByTimeAsync(400);
    expect(onSave).toHaveBeenCalledWith("Payments", null, null, null);
  });

  it("debounces rapid successive edits into a single save", async () => {
    // GIVEN a panel for an element
    const onSave = vi.fn();
    render(<ElementPanel element={element({ name: "Booking" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the name is changed multiple times in quick succession
    fireEvent.change(screen.getByTestId("element-panel-name"), { target: { value: "P" } });
    await vi.advanceTimersByTimeAsync(200);
    fireEvent.change(screen.getByTestId("element-panel-name"), { target: { value: "Pa" } });
    await vi.advanceTimersByTimeAsync(200);
    fireEvent.change(screen.getByTestId("element-panel-name"), { target: { value: "Payments" } });
    await vi.advanceTimersByTimeAsync(400);

    // THEN only the final value is saved, once
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Payments", null, null, null);
  });

  it("does not save when the name is blank", async () => {
    // GIVEN a panel for an element
    const onSave = vi.fn();
    render(<ElementPanel element={element({ name: "Booking" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the name is cleared
    fireEvent.change(screen.getByTestId("element-panel-name"), { target: { value: "   " } });
    await vi.advanceTimersByTimeAsync(400);

    // THEN no save is triggered
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps a pending edit when the element prop is recreated with the same id", async () => {
    // GIVEN a panel mid-edit — the parent recreates the `element` object on every
    // render (e.g. an unrelated React Flow node dimension update), not just when
    // a different element is actually selected
    const onSave = vi.fn();
    const { rerender } = render(
      <ElementPanel element={element({ id: "element-1", name: "Booking" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByTestId("element-panel-name"), { target: { value: "Payments" } });

    // WHEN the parent re-renders with a new object for the *same* element, before the debounce fires
    await vi.advanceTimersByTimeAsync(100);
    rerender(<ElementPanel element={element({ id: "element-1", name: "Booking" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);
    await vi.advanceTimersByTimeAsync(400);

    // THEN the pending edit is still saved, not silently discarded
    expect(onSave).toHaveBeenCalledWith("Payments", null, null, null);
  });

  it("does not save when switching to a different element", async () => {
    // GIVEN a panel showing one element
    const onSave = vi.fn();
    const { rerender } = render(
      <ElementPanel element={element({ id: "element-1", name: "Booking" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />,
    );

    // WHEN a different element is selected (new props, not a user edit)
    rerender(<ElementPanel element={element({ id: "element-2", name: "Payment" })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);
    await vi.advanceTimersByTimeAsync(400);

    // THEN no save is triggered, and the form now shows the new element's values
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("element-panel-name")).toHaveValue("Payment");
  });

  it("requires a second click to confirm delete", async () => {
    // GIVEN a panel for an element
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ElementPanel element={element()} onSave={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);

    // WHEN the delete button is clicked once
    await user.click(screen.getByTestId("element-panel-delete"));

    // THEN it asks for confirmation instead of deleting immediately
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId("element-panel-delete")).toHaveTextContent("Confirm delete?");

    // WHEN it is clicked again
    await user.click(screen.getByTestId("element-panel-delete"));

    // THEN the element is deleted
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows the archetype selector for a container, set to its current archetype", () => {
    // GIVEN a container tagged as a database
    render(
      <ElementPanel
        element={element({ kind: "container", archetype: "database" })}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // WHEN the panel renders
    // THEN the archetype selector shows the current value
    expect(screen.getByTestId("element-panel-archetype")).toHaveValue("database");
  });

  it("shows the archetype selector for a component", () => {
    // GIVEN a component with no archetype set
    render(<ElementPanel element={element({ kind: "component", archetype: null })} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the panel renders
    // THEN the archetype selector is shown, defaulting to Generic
    expect(screen.getByTestId("element-panel-archetype")).toHaveValue("");
  });

  it("does not show the archetype selector for a system", () => {
    // GIVEN a top-level system (C1) — archetype does not apply there
    render(<ElementPanel element={element({ kind: "system" })} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the panel renders
    // THEN no archetype selector is shown
    expect(screen.queryByTestId("element-panel-archetype")).not.toBeInTheDocument();
  });

  it("preselects the archetype from a recognized technology", () => {
    // GIVEN a container with no archetype set yet
    render(<ElementPanel element={element({ kind: "container", archetype: null })} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN a technology that maps to a known archetype is entered
    fireEvent.change(screen.getByTestId("element-panel-technology"), { target: { value: "MongoDB" } });

    // THEN the archetype selector is preselected accordingly
    expect(screen.getByTestId("element-panel-archetype")).toHaveValue("database");
  });

  it("does not override an already-chosen archetype when the technology changes", () => {
    // GIVEN a container explicitly set to Service, using an unrelated technology
    render(<ElementPanel element={element({ kind: "container", archetype: "service" })} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the technology is changed to one that would normally suggest Database
    fireEvent.change(screen.getByTestId("element-panel-technology"), { target: { value: "MongoDB" } });

    // THEN the explicit archetype choice is left untouched
    expect(screen.getByTestId("element-panel-archetype")).toHaveValue("service");
  });

  it("does not preselect an archetype for a system, which has no archetype selector", () => {
    // GIVEN a system (archetype does not apply there)
    render(<ElementPanel element={element({ kind: "system" })} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN a technology that would normally suggest an archetype is entered
    fireEvent.change(screen.getByTestId("element-panel-technology"), { target: { value: "MongoDB" } });

    // THEN there is still no archetype selector to show it in
    expect(screen.queryByTestId("element-panel-archetype")).not.toBeInTheDocument();
  });

  it("saves the selected archetype after the debounce delay", async () => {
    // GIVEN a panel for a container with no archetype
    const onSave = vi.fn();
    render(<ElementPanel element={element({ kind: "container", archetype: null })} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the archetype is changed
    fireEvent.change(screen.getByTestId("element-panel-archetype"), { target: { value: "queue" } });
    await vi.advanceTimersByTimeAsync(400);

    // THEN the new archetype is saved alongside the unchanged name
    expect(onSave).toHaveBeenCalledWith("Booking", null, null, "queue");
  });

  it("offers known technology names as autocomplete suggestions", () => {
    // GIVEN a panel for an element
    render(<ElementPanel element={element()} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);

    // WHEN the panel renders
    // THEN the technology input is linked to a datalist offering known technologies
    const input = screen.getByTestId("element-panel-technology");
    const listId = input.getAttribute("list");
    expect(listId).toBeTruthy();
    const options = document.querySelectorAll(`#${listId} option`);
    expect(options.length).toBeGreaterThan(0);
    expect(Array.from(options).map((o) => o.getAttribute("value"))).toContain("MongoDB");
  });

  it("calls onClose when the close button is clicked", async () => {
    // GIVEN a panel for an element
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ElementPanel element={element()} onSave={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);

    // WHEN the close button is clicked
    await user.click(screen.getByTestId("element-panel-close"));

    // THEN onClose is called
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

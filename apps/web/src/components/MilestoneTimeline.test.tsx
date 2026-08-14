import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Milestone } from "../api";
import { MilestoneTimeline } from "./MilestoneTimeline";

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "milestone-1",
    project_id: "project-1",
    label: "Launch",
    occurs_on: null,
    sort_order: 0,
    created_at: "2026-08-10T00:00:00+00:00",
    ...overrides,
  };
}

function renderTimeline(props: Partial<Parameters<typeof MilestoneTimeline>[0]> = {}) {
  return render(
    <MilestoneTimeline
      milestones={[milestone()]}
      selectedMilestoneId="milestone-1"
      onSelect={vi.fn()}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onReorder={vi.fn()}
      today="2026-06-01"
      {...props}
    />,
  );
}

describe("MilestoneTimeline", () => {
  it("renders milestones ordered by sort_order, not creation/prop order", () => {
    // GIVEN milestones passed out of sort_order
    renderTimeline({
      milestones: [milestone({ id: "b", label: "Second", sort_order: 1 }), milestone({ id: "a", label: "First", sort_order: 0 })],
      selectedMilestoneId: "a",
    });

    // WHEN the timeline renders
    // THEN items appear in sort_order order
    const items = screen.getAllByTestId("milestone-timeline-item");
    expect(items.map((item) => item.textContent)).toEqual(["First", "Second"]);
  });

  it("marks the selected milestone as current", () => {
    // GIVEN two milestones, the second one selected
    renderTimeline({
      milestones: [milestone({ id: "a", label: "First", sort_order: 0 }), milestone({ id: "b", label: "Second", sort_order: 1 })],
      selectedMilestoneId: "b",
    });

    // WHEN the timeline renders
    // THEN only the selected one is marked current
    const items = screen.getAllByTestId("milestone-timeline-item");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[1]).toHaveAttribute("aria-current", "true");
  });

  it("calls onSelect with the clicked milestone's id", () => {
    // GIVEN two milestones
    const onSelect = vi.fn();
    renderTimeline({
      milestones: [milestone({ id: "a", label: "First", sort_order: 0 }), milestone({ id: "b", label: "Second", sort_order: 1 })],
      selectedMilestoneId: "a",
      onSelect,
    });

    // WHEN a different milestone is clicked
    fireEvent.click(screen.getByText("Second"));

    // THEN onSelect is called with its id
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("renders the today marker after the last dated milestone on or before today", () => {
    // GIVEN milestones dated before and after today
    renderTimeline({
      milestones: [
        milestone({ id: "a", label: "First", sort_order: 0, occurs_on: "2026-01-01" }),
        milestone({ id: "b", label: "Second", sort_order: 1, occurs_on: "2026-12-01" }),
      ],
      selectedMilestoneId: "a",
    });

    // WHEN the timeline renders
    // THEN the today marker appears, positioned right after the past milestone
    const marker = screen.getByTestId("milestone-timeline-today");
    const items = screen.getAllByTestId("milestone-timeline-item");
    expect(items[0].compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(marker.compareDocumentPosition(items[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render a today marker when no milestone has a date", () => {
    // GIVEN milestones with no occurs_on date
    renderTimeline({ milestones: [milestone({ id: "a", label: "First", sort_order: 0 })], selectedMilestoneId: "a" });

    // WHEN the timeline renders
    // THEN no today marker is shown
    expect(screen.queryByTestId("milestone-timeline-today")).not.toBeInTheDocument();
  });

  it("calls onCreate when the + button is clicked", () => {
    // GIVEN a timeline
    const onCreate = vi.fn();
    renderTimeline({ onCreate });

    // WHEN the "New milestone" button is clicked
    fireEvent.click(screen.getByTestId("milestone-timeline-create"));

    // THEN onCreate is called
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows an editor only for the selected milestone", () => {
    // GIVEN two milestones, the second one selected
    renderTimeline({
      milestones: [milestone({ id: "a", label: "First", sort_order: 0 }), milestone({ id: "b", label: "Second", sort_order: 1 })],
      selectedMilestoneId: "b",
    });

    // WHEN the timeline renders
    // THEN exactly one editor is shown, for the selected milestone
    expect(screen.getByTestId("milestone-timeline-label-input")).toHaveValue("Second");
  });

  describe("editor", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls onUpdate with the new label and date after the debounce delay", async () => {
      // GIVEN the selected milestone's editor
      const onUpdate = vi.fn();
      renderTimeline({ onUpdate });

      // WHEN the label is changed
      fireEvent.change(screen.getByTestId("milestone-timeline-label-input"), { target: { value: "Beta" } });

      // THEN onUpdate is not called immediately
      expect(onUpdate).not.toHaveBeenCalled();

      // AND it is called once the debounce delay has elapsed
      await vi.advanceTimersByTimeAsync(400);
      expect(onUpdate).toHaveBeenCalledWith("milestone-1", "Beta", null);
    });

    it("calls onUpdate with the new date", async () => {
      // GIVEN the selected milestone's editor
      const onUpdate = vi.fn();
      renderTimeline({ onUpdate });

      // WHEN the date is set
      fireEvent.change(screen.getByTestId("milestone-timeline-date-input"), { target: { value: "2026-09-01" } });
      await vi.advanceTimersByTimeAsync(400);

      // THEN onUpdate is called with the new date
      expect(onUpdate).toHaveBeenCalledWith("milestone-1", "Launch", "2026-09-01");
    });

    it("does not save when switching to a different milestone", async () => {
      // GIVEN the timeline with one milestone selected
      const onUpdate = vi.fn();
      const { rerender } = render(
        <MilestoneTimeline
          milestones={[milestone({ id: "a", label: "First" }), milestone({ id: "b", label: "Second", sort_order: 1 })]}
          selectedMilestoneId="a"
          onSelect={vi.fn()}
          onCreate={vi.fn()}
          onUpdate={onUpdate}
          onReorder={vi.fn()}
          today="2026-06-01"
        />,
      );

      // WHEN a different milestone becomes selected (new props, not a user edit)
      rerender(
        <MilestoneTimeline
          milestones={[milestone({ id: "a", label: "First" }), milestone({ id: "b", label: "Second", sort_order: 1 })]}
          selectedMilestoneId="b"
          onSelect={vi.fn()}
          onCreate={vi.fn()}
          onUpdate={onUpdate}
          onReorder={vi.fn()}
          today="2026-06-01"
        />,
      );
      await vi.advanceTimersByTimeAsync(400);

      // THEN no save is triggered, and the editor now shows the new selection's values
      expect(onUpdate).not.toHaveBeenCalled();
      expect(screen.getByTestId("milestone-timeline-label-input")).toHaveValue("Second");
    });
  });

  describe("reordering", () => {
    it("disables moving earlier for the first milestone", () => {
      // GIVEN the first of two milestones selected
      renderTimeline({
        milestones: [milestone({ id: "a", label: "First", sort_order: 0 }), milestone({ id: "b", label: "Second", sort_order: 1 })],
        selectedMilestoneId: "a",
      });

      // WHEN the editor renders
      // THEN "move earlier" is disabled, "move later" is not
      expect(screen.getByTestId("milestone-timeline-move-earlier")).toBeDisabled();
      expect(screen.getByTestId("milestone-timeline-move-later")).not.toBeDisabled();
    });

    it("disables moving later for the last milestone", () => {
      // GIVEN the last of two milestones selected
      renderTimeline({
        milestones: [milestone({ id: "a", label: "First", sort_order: 0 }), milestone({ id: "b", label: "Second", sort_order: 1 })],
        selectedMilestoneId: "b",
      });

      // WHEN the editor renders
      // THEN "move later" is disabled, "move earlier" is not
      expect(screen.getByTestId("milestone-timeline-move-later")).toBeDisabled();
      expect(screen.getByTestId("milestone-timeline-move-earlier")).not.toBeDisabled();
    });

    it("swaps with the previous milestone when moved earlier", () => {
      // GIVEN three milestones, the middle one selected
      const onReorder = vi.fn();
      renderTimeline({
        milestones: [
          milestone({ id: "a", label: "First", sort_order: 0 }),
          milestone({ id: "b", label: "Second", sort_order: 1 }),
          milestone({ id: "c", label: "Third", sort_order: 2 }),
        ],
        selectedMilestoneId: "b",
        onReorder,
      });

      // WHEN moving it earlier
      fireEvent.click(screen.getByTestId("milestone-timeline-move-earlier"));

      // THEN onReorder is called with it swapped with its predecessor
      expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
    });

    it("swaps with the next milestone when moved later", () => {
      // GIVEN three milestones, the middle one selected
      const onReorder = vi.fn();
      renderTimeline({
        milestones: [
          milestone({ id: "a", label: "First", sort_order: 0 }),
          milestone({ id: "b", label: "Second", sort_order: 1 }),
          milestone({ id: "c", label: "Third", sort_order: 2 }),
        ],
        selectedMilestoneId: "b",
        onReorder,
      });

      // WHEN moving it later
      fireEvent.click(screen.getByTestId("milestone-timeline-move-later"));

      // THEN onReorder is called with it swapped with its successor
      expect(onReorder).toHaveBeenCalledWith(["a", "c", "b"]);
    });
  });
});

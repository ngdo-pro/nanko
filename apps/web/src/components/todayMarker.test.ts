import { describe, expect, it } from "vitest";
import { todayMarkerIndex } from "./todayMarker";

function m(occurs_on: string | null) {
  return { occurs_on };
}

describe("todayMarkerIndex", () => {
  it("returns null when no milestone has a date", () => {
    // GIVEN milestones with no occurs_on date at all
    // WHEN locating the today marker
    // THEN there is nothing to anchor it to — no marker
    expect(todayMarkerIndex([m(null), m(null)], "2026-06-01")).toBeNull();
  });

  it("returns the index of the last dated milestone on or before today", () => {
    // GIVEN milestones dated before, at, and after today
    const milestones = [m("2026-01-01"), m("2026-06-01"), m("2026-12-01")];

    // WHEN today falls exactly on the second milestone's date
    // THEN the marker goes right after that milestone
    expect(todayMarkerIndex(milestones, "2026-06-01")).toBe(1);
  });

  it("skips undated milestones when locating the marker", () => {
    // GIVEN a dated milestone followed by an undated one
    const milestones = [m("2026-01-01"), m(null)];

    // WHEN today is after the only dated milestone
    // THEN the marker goes after the dated one, not the undated one
    expect(todayMarkerIndex(milestones, "2026-06-01")).toBe(0);
  });

  it("returns -1 when every dated milestone is still in the future", () => {
    // GIVEN milestones dated entirely after today
    const milestones = [m("2026-06-01"), m("2026-12-01")];

    // WHEN today is before all of them
    // THEN the marker belongs before the first one
    expect(todayMarkerIndex(milestones, "2026-01-01")).toBe(-1);
  });

  it("does not assume dates are in sort_order order", () => {
    // GIVEN milestones whose dates are out of order relative to their position
    const milestones = [m("2027-01-01"), m("2025-01-01")];

    // WHEN today falls after the second (out-of-order) milestone's date
    // THEN the marker follows array position, not chronological order
    expect(todayMarkerIndex(milestones, "2026-01-01")).toBe(1);
  });
});

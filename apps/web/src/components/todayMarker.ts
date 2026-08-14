import type { Milestone } from "../api";

// `sort_order` is the display order; `occurs_on` is only used for the
// past/future styling and this marker — the two can legitimately disagree
// (an undated milestone, or one whose date isn't chronological relative to
// its neighbors), so this walks milestones in the given (sort_order) order
// rather than sorting by date.
//
// Returns:
//   - null: no milestone has an occurs_on date at all — there's nothing to
//     anchor a marker to, so it should be omitted entirely.
//   - -1: at least one milestone has a date, but none is on/before `today` —
//     the marker belongs before the first milestone.
//   - i (0..length-1): the marker belongs right after milestones[i], the
//     last (in array order) dated milestone on/before `today`.
export function todayMarkerIndex(milestones: Pick<Milestone, "occurs_on">[], today: string): number | null {
  let lastPastIndex = -1;
  let hasAnyDate = false;

  milestones.forEach((milestone, index) => {
    if (milestone.occurs_on === null) return;
    hasAnyDate = true;
    if (milestone.occurs_on <= today) lastPastIndex = index;
  });

  return hasAnyDate ? lastPastIndex : null;
}

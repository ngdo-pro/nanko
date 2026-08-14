import { describe, expect, it } from "vitest";
import { diffStatusMeta } from "./diffStatus";
import { relationLabelText } from "./relationLabelText";

describe("relationLabelText", () => {
  it("returns the label as-is with no diff status and a realized relation", () => {
    // GIVEN a normal, realized relation with a label
    // WHEN computing its label text
    // THEN the label is returned unchanged
    expect(relationLabelText("calls", false, null)).toBe("calls");
  });

  it("returns null with no label, no diff status, and a realized relation", () => {
    // GIVEN a normal, realized relation with no label
    // WHEN computing its label text
    // THEN there is nothing to show
    expect(relationLabelText(null, false, null)).toBeNull();
  });

  it("appends 'not realized' to an unrealized relation's label", () => {
    // GIVEN an unrealized declared relation with a label
    // WHEN computing its label text
    // THEN "not realized" is appended
    expect(relationLabelText("calls", true, null)).toBe("calls — not realized");
  });

  it("shows just 'not realized' for an unrealized relation with no label", () => {
    // GIVEN an unrealized declared relation with no label
    // WHEN computing its label text
    // THEN only "not realized" is shown
    expect(relationLabelText(null, true, null)).toBe("not realized");
  });

  it("prefixes an existing label with the diff symbol", () => {
    // GIVEN a modified relation with a label
    const diff = diffStatusMeta("modified");

    // WHEN computing its label text
    // THEN the symbol is prefixed to the label
    expect(relationLabelText("calls", false, diff)).toBe("~ calls");
  });

  it("shows just the diff symbol when there is no label", () => {
    // GIVEN an added relation with no label (the common case)
    const diff = diffStatusMeta("added");

    // WHEN computing its label text
    // THEN the symbol alone is shown — it can't depend on a label existing
    expect(relationLabelText(null, false, diff)).toBe("+");
  });

  it("ignores the unrealized flag once a diff status is set", () => {
    // GIVEN a relation that is both unrealized and part of a comparison
    const diff = diffStatusMeta("removed");

    // WHEN computing its label text
    // THEN the diff symbol wins, "not realized" is not shown
    expect(relationLabelText("calls", true, diff)).toBe("− calls");
  });
});

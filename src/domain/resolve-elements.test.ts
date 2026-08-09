import { describe, expect, it } from "vitest";
import { testDb } from "@/db/test/client";
import { makeElement, makeMilestone, makeProject, setElementVersion } from "@/db/test/fixtures";
import { resolveElements } from "./resolve-elements";

describe("resolveElements", () => {
  it("resolves the version, visibility and parent across three milestones", async () => {
    const project = await makeProject();
    const m1 = await makeMilestone(project.id, 1, { label: "2026-Q1" });
    const m2 = await makeMilestone(project.id, 2, { label: "2026-Q2" });
    const m3 = await makeMilestone(project.id, 3, { label: "2026-Q3" });

    const booking = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m1.id,
      kind: "system",
    });
    await setElementVersion({
      elementId: booking.id,
      milestoneId: m1.id,
      name: "Booking",
      technology: undefined,
    });
    await setElementVersion({
      elementId: booking.id,
      milestoneId: m2.id,
      name: "Booking",
      technology: "Node.js 20", // edited at M2
    });

    // Created at M2, so must be invisible at M1.
    const payment = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m2.id,
      parentId: booking.id,
      kind: "container",
    });
    await setElementVersion({ elementId: payment.id, milestoneId: m2.id, name: "Payment" });

    // Deleted at M3, so must still be visible at M2 but gone at M3.
    const legacy = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m1.id,
      deletedAtMilestoneId: m3.id,
      kind: "container",
    });
    await setElementVersion({ elementId: legacy.id, milestoneId: m1.id, name: "Legacy" });

    const atM1 = await resolveElements(testDb, project.id, m1.id);
    expect(atM1.map((e) => e.name).sort()).toEqual(["Booking", "Legacy"]);
    expect(atM1.find((e) => e.name === "Booking")?.technology).toBeNull();

    const atM2 = await resolveElements(testDb, project.id, m2.id);
    expect(atM2.map((e) => e.name).sort()).toEqual(["Booking", "Legacy", "Payment"]);
    expect(atM2.find((e) => e.name === "Booking")?.technology).toBe("Node.js 20");
    expect(atM2.find((e) => e.name === "Payment")?.parentId).toBe(booking.id);

    const atM3 = await resolveElements(testDb, project.id, m3.id);
    expect(atM3.map((e) => e.name).sort()).toEqual(["Booking", "Payment"]);
  });

  it("throws for a milestone that does not belong to the project", async () => {
    const projectA = await makeProject();
    const projectB = await makeProject();
    const milestoneOfB = await makeMilestone(projectB.id, 1);

    await expect(resolveElements(testDb, projectA.id, milestoneOfB.id)).rejects.toThrow(
      /not found/,
    );
  });

  it("nulls out parentId when the parent is not itself visible at the target milestone", async () => {
    const project = await makeProject();
    const m1 = await makeMilestone(project.id, 1);
    const m2 = await makeMilestone(project.id, 2);

    const parent = await makeElement({ projectId: project.id, createdAtMilestoneId: m1.id });
    await setElementVersion({ elementId: parent.id, milestoneId: m1.id, name: "Parent" });

    // Deleted at M2, while its child survives — so at M2 the child's
    // parentId would otherwise dangle.
    const deletedParent = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m1.id,
      deletedAtMilestoneId: m2.id,
      kind: "container",
    });
    await setElementVersion({ elementId: deletedParent.id, milestoneId: m1.id, name: "Deleted" });

    const child = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m1.id,
      parentId: deletedParent.id,
    });
    await setElementVersion({ elementId: child.id, milestoneId: m1.id, name: "Child" });

    const atM2 = await resolveElements(testDb, project.id, m2.id);
    expect(atM2.map((e) => e.name).sort()).toEqual(["Child", "Parent"]);
    expect(atM2.find((e) => e.name === "Child")?.parentId).toBeNull();
  });

  it("skips a visible element that has no version at or before the milestone instead of throwing", async () => {
    const project = await makeProject();
    const m1 = await makeMilestone(project.id, 1);

    await makeElement({ projectId: project.id, createdAtMilestoneId: m1.id });

    const versioned = await makeElement({ projectId: project.id, createdAtMilestoneId: m1.id });
    await setElementVersion({ elementId: versioned.id, milestoneId: m1.id, name: "Versioned" });

    const atM1 = await resolveElements(testDb, project.id, m1.id);
    expect(atM1.map((e) => e.name)).toEqual(["Versioned"]);
  });

  it("nulls out parentId when the parent is visible but skipped for lacking a version", async () => {
    const project = await makeProject();
    const m1 = await makeMilestone(project.id, 1);

    const versionlessParent = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m1.id,
    });

    const child = await makeElement({
      projectId: project.id,
      createdAtMilestoneId: m1.id,
      parentId: versionlessParent.id,
    });
    await setElementVersion({ elementId: child.id, milestoneId: m1.id, name: "Child" });

    const atM1 = await resolveElements(testDb, project.id, m1.id);
    expect(atM1.map((e) => e.name)).toEqual(["Child"]);
    expect(atM1[0]?.parentId).toBeNull();
  });
});

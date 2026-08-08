import { testDb } from "./client";
import { element, elementVersion, milestone, project } from "@/db/schema";

let projectSlugCounter = 0;

export async function makeProject(overrides: Partial<{ name: string; slug: string }> = {}) {
  projectSlugCounter += 1;
  const [row] = await testDb
    .insert(project)
    .values({
      name: overrides.name ?? "Test Project",
      slug: overrides.slug ?? `test-project-${projectSlugCounter}`,
    })
    .returning();
  return row!;
}

export async function makeMilestone(
  projectId: string,
  sortOrder: number,
  overrides: Partial<{ label: string; occursOn: string }> = {},
) {
  const [row] = await testDb
    .insert(milestone)
    .values({
      projectId,
      sortOrder,
      label: overrides.label ?? `M${sortOrder}`,
      occursOn: overrides.occursOn,
    })
    .returning();
  return row!;
}

export async function makeElement(params: {
  projectId: string;
  createdAtMilestoneId: string;
  deletedAtMilestoneId?: string;
  parentId?: string;
  kind?: (typeof element.$inferInsert)["kind"];
}) {
  const [row] = await testDb
    .insert(element)
    .values({
      projectId: params.projectId,
      createdAtMilestoneId: params.createdAtMilestoneId,
      deletedAtMilestoneId: params.deletedAtMilestoneId,
      parentId: params.parentId,
      kind: params.kind ?? "system",
    })
    .returning();
  return row!;
}

export async function setElementVersion(params: {
  elementId: string;
  milestoneId: string;
  name: string;
  description?: string;
  technology?: string;
}) {
  const [row] = await testDb
    .insert(elementVersion)
    .values({
      elementId: params.elementId,
      milestoneId: params.milestoneId,
      name: params.name,
      description: params.description,
      technology: params.technology,
    })
    .returning();
  return row!;
}

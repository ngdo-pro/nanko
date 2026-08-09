import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { element, elementVersion, milestone } from "@/db/schema";
import type * as schema from "@/db/schema";

export interface ResolvedElement {
  id: string;
  parentId: string | null;
  kind: string;
  isExternal: boolean;
  name: string;
  description: string | null;
  technology: string | null;
}

/**
 * Element visibility + attribute resolution slice of the resolveGraph()
 * spec in PLAN.md (relations/positions/warnings are Phase 1, not bootstrap
 * scope). Rules implemented here:
 *  - visible at M: created_at_milestone.sort_order <= M.sort_order AND
 *    (deleted_at_milestone IS NULL OR deleted_at_milestone.sort_order > M.sort_order)
 *  - resolved attributes: element_version row with the greatest
 *    milestone.sort_order <= M.sort_order
 */
export async function resolveElements(
  db: NodePgDatabase<typeof schema>,
  projectId: string,
  milestoneId: string,
): Promise<ResolvedElement[]> {
  const [targetMilestone] = await db
    .select({ sortOrder: milestone.sortOrder })
    .from(milestone)
    .where(and(eq(milestone.id, milestoneId), eq(milestone.projectId, projectId)));

  if (!targetMilestone) {
    throw new Error(`Milestone ${milestoneId} not found in project ${projectId}`);
  }
  const targetSortOrder = targetMilestone.sortOrder;

  const createdMilestone = alias(milestone, "created_milestone");
  const deletedMilestone = alias(milestone, "deleted_milestone");

  const visibleElements = await db
    .select({
      id: element.id,
      parentId: element.parentId,
      kind: element.kind,
      isExternal: element.isExternal,
    })
    .from(element)
    .innerJoin(
      createdMilestone,
      and(
        eq(createdMilestone.id, element.createdAtMilestoneId),
        eq(createdMilestone.projectId, projectId),
      ),
    )
    .leftJoin(
      deletedMilestone,
      and(
        eq(deletedMilestone.id, element.deletedAtMilestoneId),
        eq(deletedMilestone.projectId, projectId),
      ),
    )
    .where(
      and(
        eq(element.projectId, projectId),
        lte(createdMilestone.sortOrder, targetSortOrder),
        or(isNull(element.deletedAtMilestoneId), gt(deletedMilestone.sortOrder, targetSortOrder)),
      ),
    );

  if (visibleElements.length === 0) return [];

  const visibleIds = new Set(visibleElements.map((e) => e.id));
  const versionMilestone = alias(milestone, "version_milestone");

  const versions = await db
    .selectDistinctOn([elementVersion.elementId], {
      elementId: elementVersion.elementId,
      name: elementVersion.name,
      description: elementVersion.description,
      technology: elementVersion.technology,
    })
    .from(elementVersion)
    .innerJoin(
      versionMilestone,
      and(
        eq(versionMilestone.id, elementVersion.milestoneId),
        eq(versionMilestone.projectId, projectId),
      ),
    )
    .where(
      and(
        inArray(elementVersion.elementId, [...visibleIds]),
        lte(versionMilestone.sortOrder, targetSortOrder),
      ),
    )
    .orderBy(elementVersion.elementId, desc(versionMilestone.sortOrder));

  const latestVersionByElement = new Map(versions.map((v) => [v.elementId, v]));

  // An element visible at this milestone with no version at or before it is
  // a data-integrity gap for that one element, not the whole graph — skip
  // it rather than failing every element's resolution. resolvedIds (not
  // visibleIds) is what parentId must be checked against below, since a
  // skipped parent must also null out its children's parentId.
  const resolvedIds = new Set(
    visibleElements.filter((e) => latestVersionByElement.has(e.id)).map((e) => e.id),
  );

  return visibleElements.flatMap((visible) => {
    const version = latestVersionByElement.get(visible.id);
    if (!version) return [];
    return [
      {
        id: visible.id,
        parentId: visible.parentId && resolvedIds.has(visible.parentId) ? visible.parentId : null,
        kind: visible.kind,
        isExternal: visible.isExternal,
        name: version.name,
        description: version.description,
        technology: version.technology,
      },
    ];
  });
}

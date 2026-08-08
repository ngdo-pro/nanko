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
    .innerJoin(createdMilestone, eq(createdMilestone.id, element.createdAtMilestoneId))
    .leftJoin(deletedMilestone, eq(deletedMilestone.id, element.deletedAtMilestoneId))
    .where(
      and(
        eq(element.projectId, projectId),
        lte(createdMilestone.sortOrder, targetSortOrder),
        or(isNull(element.deletedAtMilestoneId), gt(deletedMilestone.sortOrder, targetSortOrder)),
      ),
    );

  if (visibleElements.length === 0) return [];

  const elementIds = visibleElements.map((e) => e.id);
  const versionMilestone = alias(milestone, "version_milestone");

  const versions = await db
    .select({
      elementId: elementVersion.elementId,
      name: elementVersion.name,
      description: elementVersion.description,
      technology: elementVersion.technology,
      sortOrder: versionMilestone.sortOrder,
    })
    .from(elementVersion)
    .innerJoin(versionMilestone, eq(versionMilestone.id, elementVersion.milestoneId))
    .where(
      and(
        inArray(elementVersion.elementId, elementIds),
        lte(versionMilestone.sortOrder, targetSortOrder),
      ),
    )
    .orderBy(elementVersion.elementId, desc(versionMilestone.sortOrder));

  // First row per elementId in this ordering is the version with the
  // greatest sortOrder <= target (a poor man's DISTINCT ON, kept simple
  // since this is bootstrap-scope, not the final resolveGraph()).
  const latestVersionByElement = new Map<string, (typeof versions)[number]>();
  for (const version of versions) {
    if (!latestVersionByElement.has(version.elementId)) {
      latestVersionByElement.set(version.elementId, version);
    }
  }

  return visibleElements.map((visible) => {
    const version = latestVersionByElement.get(visible.id);
    if (!version) {
      throw new Error(
        `Element ${visible.id} is visible at milestone ${milestoneId} but has no version at or before it`,
      );
    }
    return {
      id: visible.id,
      parentId: visible.parentId,
      kind: visible.kind,
      isExternal: visible.isExternal,
      name: version.name,
      description: version.description,
      technology: version.technology,
    };
  });
}

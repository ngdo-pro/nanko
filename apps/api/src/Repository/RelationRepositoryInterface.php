<?php

declare(strict_types=1);

namespace App\Repository;

interface RelationRepositoryInterface
{
    /**
     * @return array<string, mixed>
     *
     * @throws ProjectNotFoundException        if $projectId does not exist
     * @throws MilestoneNotFoundException      if $milestoneId does not exist for $projectId
     * @throws ElementNotFoundException        if $sourceElementId or $targetElementId does not exist
     * @throws InvalidRelationElementException if $sourceElementId or $targetElementId belongs to a different project
     */
    public function create(
        string $projectId,
        string $milestoneId,
        string $sourceElementId,
        string $targetElementId,
        ?string $label,
        ?string $technology,
    ): array;

    /**
     * @return list<array<string, mixed>>
     */
    public function findAllByProject(string $projectId): array;

    /**
     * Raw, unresolved rows for graph resolution: every relation (visible or
     * not, at any milestone) joined with every relation_version row it has.
     * One row per (relation, version) pair. Resolution (visibility,
     * latest-version-at-milestone) happens in the graph resolver, not here.
     *
     * @return list<array{
     *     id: string,
     *     project_id: string,
     *     source_element_id: string,
     *     target_element_id: string,
     *     status: string,
     *     realized_at_milestone_id: ?string,
     *     created_at_milestone_id: string,
     *     deleted_at_milestone_id: ?string,
     *     version_milestone_id: string,
     *     version_milestone_sort_order: int,
     *     label: ?string,
     *     technology: ?string,
     * }>
     */
    public function findAllVersionsByProject(string $projectId): array;
}

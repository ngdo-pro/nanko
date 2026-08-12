<?php

declare(strict_types=1);

namespace App\Repository;

interface ElementRepositoryInterface
{
    /**
     * @return array<string, mixed>
     *
     * @throws ProjectNotFoundException  if $projectId does not exist
     * @throws MilestoneNotFoundException if $milestoneId does not exist for $projectId
     * @throws ElementNotFoundException  if $parentId is given but does not exist
     * @throws InvalidParentException    if $parentId exists but belongs to a different project
     */
    public function create(
        string $projectId,
        string $milestoneId,
        string $kind,
        ?string $parentId,
        string $name,
        ?string $description,
        ?string $technology,
        bool $isExternal,
    ): array;

    /**
     * @return list<array<string, mixed>>
     */
    public function findAllByProject(string $projectId): array;

    /**
     * Raw, unresolved rows for graph resolution: every element (visible or
     * not, at any milestone) joined with every element_version row it has.
     * One row per (element, version) pair — an element with N versions
     * yields N rows. Resolution (visibility, latest-version-at-milestone)
     * happens in the graph resolver, not here.
     *
     * @return list<array{
     *     id: string,
     *     project_id: string,
     *     parent_id: ?string,
     *     kind: string,
     *     is_external: bool,
     *     created_at_milestone_id: string,
     *     deleted_at_milestone_id: ?string,
     *     version_milestone_id: string,
     *     version_milestone_sort_order: int,
     *     name: string,
     *     description: ?string,
     *     technology: ?string,
     * }>
     */
    public function findAllVersionsByProject(string $projectId): array;
}

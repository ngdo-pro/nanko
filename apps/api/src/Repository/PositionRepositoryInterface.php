<?php

declare(strict_types=1);

namespace App\Repository;

interface PositionRepositoryInterface
{
    /**
     * Upserts a position — default (milestone_id null) or milestone-specific.
     *
     * @return array<string, mixed>
     *
     * @throws ElementNotFoundException   if $elementId does not exist
     * @throws MilestoneNotFoundException if $milestoneId is given but does not exist for the element's project
     */
    public function upsert(string $elementId, ?string $milestoneId, float $x, float $y): array;

    /**
     * Raw, unresolved rows — every position row (default + per-milestone) for
     * every element in the project. Resolution (per-milestone-else-default)
     * happens in the graph resolver, not here.
     *
     * @return list<array{
     *     id: string,
     *     element_id: string,
     *     milestone_id: string|null,
     *     x: float,
     *     y: float,
     *     updated_at: string,
     * }>
     */
    public function findAllByProject(string $projectId): array;
}

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
}

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
}

<?php

declare(strict_types=1);

namespace App\Repository;

interface MilestoneRepositoryInterface
{
    /**
     * @return array<string, mixed>
     *
     * @throws ProjectNotFoundException
     */
    public function create(string $projectId, string $label, ?string $occursOn): array;

    /**
     * @return list<array<string, mixed>>
     */
    public function findAllByProject(string $projectId): array;
}

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
     * @return list<array{
     *     id: string,
     *     project_id: string,
     *     label: string,
     *     occurs_on: string|null,
     *     sort_order: int,
     *     created_at: string,
     * }>
     */
    public function findAllByProject(string $projectId): array;
}

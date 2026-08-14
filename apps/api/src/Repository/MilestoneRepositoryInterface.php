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

    /**
     * @return array<string, mixed>
     *
     * @throws MilestoneNotFoundException
     */
    public function update(string $milestoneId, string $label, ?string $occursOn): array;

    /**
     * Reassigns sort_order to exactly match the given order — the list must
     * contain every milestone of the project, no more, no less (not a
     * partial reorder).
     *
     * @param list<string> $orderedMilestoneIds
     *
     * @return list<array{
     *     id: string,
     *     project_id: string,
     *     label: string,
     *     occurs_on: string|null,
     *     sort_order: int,
     *     created_at: string,
     * }>
     *
     * @throws ProjectNotFoundException
     * @throws InvalidMilestoneOrderException if the given ids don't exactly match the project's milestones
     */
    public function reorder(string $projectId, array $orderedMilestoneIds): array;
}

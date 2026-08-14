<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\InvalidMilestoneOrderException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\MilestoneRepositoryInterface;
use App\Repository\ProjectNotFoundException;

final class InMemoryMilestoneRepository implements MilestoneRepositoryInterface
{
    /** @var array<string, true> */
    private array $projectIds = [];

    /**
     * @var array<string, list<array{
     *     id: string, project_id: string, label: string, occurs_on: string|null,
     *     sort_order: int, created_at: string,
     * }>> keyed by project id
     */
    private array $milestonesByProject = [];

    public function registerProject(string $projectId): void
    {
        $this->projectIds[$projectId] = true;
    }

    public function create(string $projectId, string $label, ?string $occursOn): array
    {
        if (!isset($this->projectIds[$projectId])) {
            throw new ProjectNotFoundException($projectId);
        }

        $existing = $this->milestonesByProject[$projectId] ?? [];

        $milestone = [
            'id' => self::uuidV4(),
            'project_id' => $projectId,
            'label' => $label,
            'occurs_on' => $occursOn,
            'sort_order' => count($existing),
            'created_at' => (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP'),
        ];

        $this->milestonesByProject[$projectId][] = $milestone;

        return $milestone;
    }

    public function findAllByProject(string $projectId): array
    {
        return $this->milestonesByProject[$projectId] ?? [];
    }

    public function update(string $milestoneId, string $label, ?string $occursOn): array
    {
        foreach ($this->milestonesByProject as $projectId => $milestones) {
            foreach ($milestones as $index => $milestone) {
                if ($milestone['id'] === $milestoneId) {
                    $updated = $milestone;
                    $updated['label'] = $label;
                    $updated['occurs_on'] = $occursOn;
                    $this->milestonesByProject[$projectId][$index] = $updated;

                    return $updated;
                }
            }
        }

        throw new MilestoneNotFoundException($milestoneId);
    }

    public function reorder(string $projectId, array $orderedMilestoneIds): array
    {
        if (!isset($this->projectIds[$projectId])) {
            throw new ProjectNotFoundException($projectId);
        }

        $existing = $this->milestonesByProject[$projectId] ?? [];
        $existingIds = array_map(static fn (array $milestone): string => $milestone['id'], $existing);

        $sortedGiven = $orderedMilestoneIds;
        sort($sortedGiven);
        $sortedExisting = $existingIds;
        sort($sortedExisting);

        if ($sortedGiven !== $sortedExisting) {
            throw new InvalidMilestoneOrderException($projectId);
        }

        $byId = [];
        foreach ($existing as $milestone) {
            $byId[$milestone['id']] = $milestone;
        }

        $reordered = [];
        foreach ($orderedMilestoneIds as $index => $id) {
            $milestone = $byId[$id];
            $milestone['sort_order'] = $index;
            $reordered[] = $milestone;
        }

        $this->milestonesByProject[$projectId] = $reordered;

        return $reordered;
    }

    private static function uuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }
}

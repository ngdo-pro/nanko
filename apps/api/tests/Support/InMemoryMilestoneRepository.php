<?php

declare(strict_types=1);

namespace App\Tests\Support;

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

<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\PositionRepositoryInterface;

final class InMemoryPositionRepository implements PositionRepositoryInterface
{
    /** @var array<string, string> element id => project id */
    private array $elementProjectIds = [];

    /** @var array<string, string> milestone id => project id */
    private array $milestoneProjectIds = [];

    /**
     * @var array<string, array<string, array{
     *     id: string, element_id: string, milestone_id: string|null, x: float, y: float, updated_at: string,
     * }>> element id => (milestone id or '__default__') => position row
     */
    private array $positionsByElement = [];

    public function registerElement(string $elementId, string $projectId): void
    {
        $this->elementProjectIds[$elementId] = $projectId;
    }

    public function registerMilestone(string $milestoneId, string $projectId): void
    {
        $this->milestoneProjectIds[$milestoneId] = $projectId;
    }

    public function upsert(string $elementId, ?string $milestoneId, float $x, float $y): array
    {
        $projectId = $this->elementProjectIds[$elementId] ?? null;

        if ($projectId === null) {
            throw new ElementNotFoundException($elementId);
        }

        if ($milestoneId !== null && ($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        $key = $milestoneId ?? '__default__';
        $existingId = $this->positionsByElement[$elementId][$key]['id'] ?? null;

        $position = [
            'id' => $existingId ?? self::uuidV4(),
            'element_id' => $elementId,
            'milestone_id' => $milestoneId,
            'x' => $x,
            'y' => $y,
            'updated_at' => (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP'),
        ];

        $this->positionsByElement[$elementId][$key] = $position;

        return $position;
    }

    public function findAllByProject(string $projectId): array
    {
        $rows = [];

        foreach ($this->elementProjectIds as $elementId => $elementProjectId) {
            if ($elementProjectId !== $projectId) {
                continue;
            }

            foreach ($this->positionsByElement[$elementId] ?? [] as $position) {
                $rows[] = $position;
            }
        }

        return $rows;
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

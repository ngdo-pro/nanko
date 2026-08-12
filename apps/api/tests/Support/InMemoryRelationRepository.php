<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\InvalidRelationElementException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationRepositoryInterface;

final class InMemoryRelationRepository implements RelationRepositoryInterface
{
    /** @var array<string, true> */
    private array $projectIds = [];

    /** @var array<string, string> milestone id => project id */
    private array $milestoneProjectIds = [];

    /** @var array<string, string> element id => project id */
    private array $elementProjectIds = [];

    /** @var array<string, list<array<string, mixed>>> keyed by project id, in creation order */
    private array $relationsByProject = [];

    public function registerProject(string $projectId): void
    {
        $this->projectIds[$projectId] = true;
    }

    public function registerMilestone(string $milestoneId, string $projectId): void
    {
        $this->milestoneProjectIds[$milestoneId] = $projectId;
    }

    public function registerElement(string $elementId, string $projectId): void
    {
        $this->elementProjectIds[$elementId] = $projectId;
    }

    public function create(
        string $projectId,
        string $milestoneId,
        string $sourceElementId,
        string $targetElementId,
        ?string $label,
        ?string $technology,
    ): array {
        if (!isset($this->projectIds[$projectId])) {
            throw new ProjectNotFoundException($projectId);
        }

        if (($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        $this->assertElementBelongsToProject($sourceElementId, $projectId);
        $this->assertElementBelongsToProject($targetElementId, $projectId);

        $relation = [
            'id' => self::uuidV4(),
            'project_id' => $projectId,
            'source_element_id' => $sourceElementId,
            'target_element_id' => $targetElementId,
            'status' => 'declared',
            'milestone_id' => $milestoneId,
            'label' => $label,
            'technology' => $technology,
            'created_at' => (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP'),
        ];

        $this->relationsByProject[$projectId][] = $relation;

        return $relation;
    }

    public function findAllByProject(string $projectId): array
    {
        return $this->relationsByProject[$projectId] ?? [];
    }

    private function assertElementBelongsToProject(string $elementId, string $projectId): void
    {
        if (!isset($this->elementProjectIds[$elementId])) {
            throw new ElementNotFoundException($elementId);
        }

        if ($this->elementProjectIds[$elementId] !== $projectId) {
            throw new InvalidRelationElementException($elementId, $projectId);
        }
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

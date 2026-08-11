<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\ElementRepositoryInterface;
use App\Repository\InvalidParentException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;

final class InMemoryElementRepository implements ElementRepositoryInterface
{
    /** @var array<string, true> */
    private array $projectIds = [];

    /** @var array<string, string> milestone id => project id */
    private array $milestoneProjectIds = [];

    /** @var array<string, array<string, mixed>> keyed by element id */
    private array $elements = [];

    /** @var array<string, list<array<string, mixed>>> keyed by project id, in creation order */
    private array $elementsByProject = [];

    public function registerProject(string $projectId): void
    {
        $this->projectIds[$projectId] = true;
    }

    public function registerMilestone(string $milestoneId, string $projectId): void
    {
        $this->milestoneProjectIds[$milestoneId] = $projectId;
    }

    public function create(
        string $projectId,
        string $milestoneId,
        string $kind,
        ?string $parentId,
        string $name,
        ?string $description,
        ?string $technology,
        bool $isExternal,
    ): array {
        if (!isset($this->projectIds[$projectId])) {
            throw new ProjectNotFoundException($projectId);
        }

        if (($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        if ($parentId !== null) {
            if (!isset($this->elements[$parentId])) {
                throw new ElementNotFoundException($parentId);
            }

            if ($this->elements[$parentId]['project_id'] !== $projectId) {
                throw new InvalidParentException($parentId, $projectId);
            }
        }

        $now = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');

        $element = [
            'id' => self::uuidV4(),
            'project_id' => $projectId,
            'parent_id' => $parentId,
            'kind' => $kind,
            'is_external' => $isExternal,
            'milestone_id' => $milestoneId,
            'name' => $name,
            'description' => $description,
            'technology' => $technology,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $this->elements[$element['id']] = $element;
        $this->elementsByProject[$projectId][] = $element;

        return $element;
    }

    public function findAllByProject(string $projectId): array
    {
        return $this->elementsByProject[$projectId] ?? [];
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

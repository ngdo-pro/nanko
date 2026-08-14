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

    /** @var array<string, int> milestone id => sort_order */
    private array $milestoneSortOrders = [];

    /**
     * @var array<string, array{
     *     id: string, project_id: string, parent_id: string|null, kind: string, is_external: bool,
     *     archetype: string|null,
     *     created_at_milestone_id: string, deleted_at_milestone_id: string|null,
     *     created_at: string, updated_at: string,
     * }> keyed by element id
     */
    private array $elements = [];

    /**
     * @var array<string, array<string, array{name: string, description: string|null, technology: string|null}>>
     * keyed by element id, then by milestone id (insertion order = version history order)
     */
    private array $versionsByElement = [];

    /** @var array<string, list<string>> project id => element ids, in creation order */
    private array $elementIdsByProject = [];

    public function registerProject(string $projectId): void
    {
        $this->projectIds[$projectId] = true;
    }

    public function registerMilestone(string $milestoneId, string $projectId, int $sortOrder = 0): void
    {
        $this->milestoneProjectIds[$milestoneId] = $projectId;
        $this->milestoneSortOrders[$milestoneId] = $sortOrder;
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
        ?string $archetype = null,
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
        $id = self::uuidV4();

        $this->elements[$id] = [
            'id' => $id,
            'project_id' => $projectId,
            'parent_id' => $parentId,
            'kind' => $kind,
            'is_external' => $isExternal,
            'archetype' => $archetype,
            'created_at_milestone_id' => $milestoneId,
            'deleted_at_milestone_id' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $this->versionsByElement[$id][$milestoneId] = [
            'name' => $name,
            'description' => $description,
            'technology' => $technology,
        ];
        $this->elementIdsByProject[$projectId][] = $id;

        return array_merge($this->elements[$id], $this->versionsByElement[$id][$milestoneId], ['milestone_id' => $milestoneId]);
    }

    public function update(
        string $elementId,
        string $milestoneId,
        string $name,
        ?string $description,
        ?string $technology,
        ?string $archetype = null,
    ): array {
        if (!isset($this->elements[$elementId])) {
            throw new ElementNotFoundException($elementId);
        }

        $projectId = $this->elements[$elementId]['project_id'];

        if (($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        $this->versionsByElement[$elementId][$milestoneId] = [
            'name' => $name,
            'description' => $description,
            'technology' => $technology,
        ];
        $this->elements[$elementId]['archetype'] = $archetype;
        $this->elements[$elementId]['updated_at'] = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');

        return array_merge($this->elements[$elementId], $this->versionsByElement[$elementId][$milestoneId], ['milestone_id' => $milestoneId]);
    }

    public function softDelete(string $elementId, string $milestoneId): array
    {
        if (!isset($this->elements[$elementId])) {
            throw new ElementNotFoundException($elementId);
        }

        $projectId = $this->elements[$elementId]['project_id'];

        if (($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        $this->elements[$elementId]['deleted_at_milestone_id'] = $milestoneId;

        return $this->elements[$elementId];
    }

    public function findAllByProject(string $projectId): array
    {
        $rows = [];

        foreach ($this->elementIdsByProject[$projectId] ?? [] as $id) {
            $element = $this->elements[$id];
            $creationMilestoneId = $element['created_at_milestone_id'];
            $version = $this->versionsByElement[$id][$creationMilestoneId];

            $rows[] = array_merge($element, $version, ['milestone_id' => $creationMilestoneId]);
        }

        return $rows;
    }

    public function findAllVersionsByProject(string $projectId): array
    {
        $rows = [];

        foreach ($this->elementIdsByProject[$projectId] ?? [] as $id) {
            $element = $this->elements[$id];

            foreach ($this->versionsByElement[$id] as $versionMilestoneId => $version) {
                $rows[] = [
                    'id' => $element['id'],
                    'project_id' => $element['project_id'],
                    'parent_id' => $element['parent_id'],
                    'kind' => $element['kind'],
                    'is_external' => $element['is_external'],
                    'archetype' => $element['archetype'],
                    'created_at_milestone_id' => $element['created_at_milestone_id'],
                    'deleted_at_milestone_id' => $element['deleted_at_milestone_id'],
                    'version_milestone_id' => $versionMilestoneId,
                    'version_milestone_sort_order' => $this->milestoneSortOrders[$versionMilestoneId] ?? 0,
                    'name' => $version['name'],
                    'description' => $version['description'],
                    'technology' => $version['technology'],
                ];
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

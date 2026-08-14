<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\InvalidRelationElementException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationNotFoundException;
use App\Repository\RelationRepositoryInterface;

final class InMemoryRelationRepository implements RelationRepositoryInterface
{
    /** @var array<string, true> */
    private array $projectIds = [];

    /** @var array<string, string> milestone id => project id */
    private array $milestoneProjectIds = [];

    /** @var array<string, int> milestone id => sort_order */
    private array $milestoneSortOrders = [];

    /** @var array<string, string> element id => project id */
    private array $elementProjectIds = [];

    /**
     * @var array<string, array{
     *     id: string, project_id: string, source_element_id: string, target_element_id: string,
     *     status: string, created_at_milestone_id: string, deleted_at_milestone_id: string|null,
     *     created_at: string,
     * }> keyed by relation id
     */
    private array $relations = [];

    /**
     * @var array<string, array<string, array{label: string|null, technology: string|null}>>
     * keyed by relation id, then by milestone id (insertion order = version history order)
     */
    private array $versionsByRelation = [];

    /** @var array<string, list<string>> project id => relation ids, in creation order */
    private array $relationIdsByProject = [];

    public function registerProject(string $projectId): void
    {
        $this->projectIds[$projectId] = true;
    }

    public function registerMilestone(string $milestoneId, string $projectId, int $sortOrder = 0): void
    {
        $this->milestoneProjectIds[$milestoneId] = $projectId;
        $this->milestoneSortOrders[$milestoneId] = $sortOrder;
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

        $id = self::uuidV4();

        $this->relations[$id] = [
            'id' => $id,
            'project_id' => $projectId,
            'source_element_id' => $sourceElementId,
            'target_element_id' => $targetElementId,
            'status' => 'declared',
            'created_at_milestone_id' => $milestoneId,
            'deleted_at_milestone_id' => null,
            'created_at' => (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP'),
        ];
        $this->versionsByRelation[$id][$milestoneId] = [
            'label' => $label,
            'technology' => $technology,
        ];
        $this->relationIdsByProject[$projectId][] = $id;

        return array_merge($this->relations[$id], $this->versionsByRelation[$id][$milestoneId], ['milestone_id' => $milestoneId]);
    }

    public function update(
        string $relationId,
        string $milestoneId,
        ?string $label,
        ?string $technology,
    ): array {
        if (!isset($this->relations[$relationId])) {
            throw new RelationNotFoundException($relationId);
        }

        $projectId = $this->relations[$relationId]['project_id'];

        if (($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        $this->versionsByRelation[$relationId][$milestoneId] = [
            'label' => $label,
            'technology' => $technology,
        ];

        return array_merge($this->relations[$relationId], $this->versionsByRelation[$relationId][$milestoneId], ['milestone_id' => $milestoneId]);
    }

    public function softDelete(string $relationId, string $milestoneId): array
    {
        if (!isset($this->relations[$relationId])) {
            throw new RelationNotFoundException($relationId);
        }

        $projectId = $this->relations[$relationId]['project_id'];

        if (($this->milestoneProjectIds[$milestoneId] ?? null) !== $projectId) {
            throw new MilestoneNotFoundException($milestoneId);
        }

        $this->relations[$relationId]['deleted_at_milestone_id'] = $milestoneId;

        return $this->relations[$relationId];
    }

    public function findAllByProject(string $projectId): array
    {
        $rows = [];

        foreach ($this->relationIdsByProject[$projectId] ?? [] as $id) {
            $relation = $this->relations[$id];
            $creationMilestoneId = $relation['created_at_milestone_id'];
            $version = $this->versionsByRelation[$id][$creationMilestoneId];

            $rows[] = array_merge($relation, $version, ['milestone_id' => $creationMilestoneId]);
        }

        return $rows;
    }

    public function findAllVersionsByProject(string $projectId): array
    {
        $rows = [];

        foreach ($this->relationIdsByProject[$projectId] ?? [] as $id) {
            $relation = $this->relations[$id];

            foreach ($this->versionsByRelation[$id] as $versionMilestoneId => $version) {
                $rows[] = [
                    'id' => $relation['id'],
                    'project_id' => $relation['project_id'],
                    'source_element_id' => $relation['source_element_id'],
                    'target_element_id' => $relation['target_element_id'],
                    'status' => $relation['status'],
                    'realized_at_milestone_id' => null,
                    'created_at_milestone_id' => $relation['created_at_milestone_id'],
                    'deleted_at_milestone_id' => $relation['deleted_at_milestone_id'],
                    'version_milestone_id' => $versionMilestoneId,
                    'version_milestone_sort_order' => $this->milestoneSortOrders[$versionMilestoneId] ?? 0,
                    'label' => $version['label'],
                    'technology' => $version['technology'],
                ];
            }
        }

        return $rows;
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

<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;

final class DoctrineRelationRepository implements RelationRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function create(
        string $projectId,
        string $milestoneId,
        string $sourceElementId,
        string $targetElementId,
        ?string $label,
        ?string $technology,
    ): array {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use (
            $projectId,
            $milestoneId,
            $sourceElementId,
            $targetElementId,
            $label,
            $technology,
        ): array {
            if ($conn->fetchOne('SELECT 1 FROM project WHERE id = :id', ['id' => $projectId]) === false) {
                throw new ProjectNotFoundException($projectId);
            }

            if ($conn->fetchOne(
                'SELECT 1 FROM milestone WHERE id = :id AND project_id = :project_id',
                ['id' => $milestoneId, 'project_id' => $projectId],
            ) === false) {
                throw new MilestoneNotFoundException($milestoneId);
            }

            $this->assertElementBelongsToProject($conn, $sourceElementId, $projectId);
            $this->assertElementBelongsToProject($conn, $targetElementId, $projectId);

            /** @var array<string, mixed> $relation */
            $relation = $conn->fetchAssociative(
                'INSERT INTO relation (project_id, source_element_id, target_element_id, created_at_milestone_id)
                 VALUES (:project_id, :source_element_id, :target_element_id, :milestone_id)
                 RETURNING id, project_id, source_element_id, target_element_id, status, created_at',
                [
                    'project_id' => $projectId,
                    'source_element_id' => $sourceElementId,
                    'target_element_id' => $targetElementId,
                    'milestone_id' => $milestoneId,
                ],
            );

            /** @var array<string, mixed> $version */
            $version = $conn->fetchAssociative(
                'INSERT INTO relation_version (relation_id, milestone_id, label, technology)
                 VALUES (:relation_id, :milestone_id, :label, :technology)
                 RETURNING label, technology',
                [
                    'relation_id' => $relation['id'],
                    'milestone_id' => $milestoneId,
                    'label' => $label,
                    'technology' => $technology,
                ],
            );

            return array_merge($relation, $version, ['milestone_id' => $milestoneId]);
        });
    }

    public function findAllByProject(string $projectId): array
    {
        // Safe as a plain join only because every relation currently has exactly one version,
        // created alongside it — this breaks once PATCH introduces multiple versions per relation.
        return $this->connection->fetchAllAssociative(
            'SELECT r.id, r.project_id, r.source_element_id, r.target_element_id, r.status,
                    r.created_at_milestone_id AS milestone_id,
                    v.label, v.technology, r.created_at
             FROM relation r
             JOIN relation_version v ON v.relation_id = r.id
             WHERE r.project_id = :project_id
             ORDER BY r.seq ASC',
            ['project_id' => $projectId],
        );
    }

    public function findAllVersionsByProject(string $projectId): array
    {
        /** @var list<array{
         *     id: string, project_id: string, source_element_id: string, target_element_id: string,
         *     status: string, realized_at_milestone_id: string|null,
         *     created_at_milestone_id: string, deleted_at_milestone_id: string|null,
         *     version_milestone_id: string, version_milestone_sort_order: int|string,
         *     label: string|null, technology: string|null,
         * }> $rows
         */
        $rows = $this->connection->fetchAllAssociative(
            'SELECT r.id, r.project_id, r.source_element_id, r.target_element_id, r.status,
                    r.realized_at_milestone_id, r.created_at_milestone_id, r.deleted_at_milestone_id,
                    v.milestone_id AS version_milestone_id, m.sort_order AS version_milestone_sort_order,
                    v.label, v.technology
             FROM relation r
             JOIN relation_version v ON v.relation_id = r.id
             JOIN milestone m ON m.id = v.milestone_id
             WHERE r.project_id = :project_id
             ORDER BY r.seq ASC, m.sort_order ASC',
            ['project_id' => $projectId],
        );

        return array_map(static fn (array $row): array => [
            'id' => $row['id'],
            'project_id' => $row['project_id'],
            'source_element_id' => $row['source_element_id'],
            'target_element_id' => $row['target_element_id'],
            'status' => $row['status'],
            'realized_at_milestone_id' => $row['realized_at_milestone_id'],
            'created_at_milestone_id' => $row['created_at_milestone_id'],
            'deleted_at_milestone_id' => $row['deleted_at_milestone_id'],
            'version_milestone_id' => $row['version_milestone_id'],
            'version_milestone_sort_order' => (int) $row['version_milestone_sort_order'],
            'label' => $row['label'],
            'technology' => $row['technology'],
        ], $rows);
    }

    private function assertElementBelongsToProject(Connection $conn, string $elementId, string $projectId): void
    {
        $elementProjectId = $conn->fetchOne('SELECT project_id FROM element WHERE id = :id', ['id' => $elementId]);

        if ($elementProjectId === false) {
            throw new ElementNotFoundException($elementId);
        }

        if ($elementProjectId !== $projectId) {
            throw new InvalidRelationElementException($elementId, $projectId);
        }
    }
}

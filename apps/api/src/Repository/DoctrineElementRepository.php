<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\ParameterType;

final class DoctrineElementRepository implements ElementRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
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
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use (
            $projectId,
            $milestoneId,
            $kind,
            $parentId,
            $name,
            $description,
            $technology,
            $isExternal,
            $archetype,
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

            if ($parentId !== null) {
                $parentProjectId = $conn->fetchOne(
                    'SELECT project_id FROM element WHERE id = :id',
                    ['id' => $parentId],
                );

                if ($parentProjectId === false) {
                    throw new ElementNotFoundException($parentId);
                }

                if ($parentProjectId !== $projectId) {
                    throw new InvalidParentException($parentId, $projectId);
                }
            }

            /** @var array<string, mixed> $element */
            $element = $conn->fetchAssociative(
                'INSERT INTO element (project_id, parent_id, kind, is_external, archetype, created_at_milestone_id)
                 VALUES (:project_id, :parent_id, :kind, :is_external, :archetype, :milestone_id)
                 RETURNING id, project_id, parent_id, kind, is_external, archetype, created_at, updated_at',
                [
                    'project_id' => $projectId,
                    'parent_id' => $parentId,
                    'kind' => $kind,
                    'is_external' => $isExternal,
                    'archetype' => $archetype,
                    'milestone_id' => $milestoneId,
                ],
                ['is_external' => ParameterType::BOOLEAN],
            );

            /** @var array<string, mixed> $version */
            $version = $conn->fetchAssociative(
                'INSERT INTO element_version (element_id, milestone_id, name, description, technology)
                 VALUES (:element_id, :milestone_id, :name, :description, :technology)
                 RETURNING name, description, technology',
                [
                    'element_id' => $element['id'],
                    'milestone_id' => $milestoneId,
                    'name' => $name,
                    'description' => $description,
                    'technology' => $technology,
                ],
            );

            return array_merge($element, $version, ['milestone_id' => $milestoneId]);
        });
    }

    public function update(
        string $elementId,
        string $milestoneId,
        string $name,
        ?string $description,
        ?string $technology,
        ?string $archetype = null,
    ): array {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use (
            $elementId,
            $milestoneId,
            $name,
            $description,
            $technology,
            $archetype,
        ): array {
            $projectId = $conn->fetchOne('SELECT project_id FROM element WHERE id = :id', ['id' => $elementId]);

            if ($projectId === false) {
                throw new ElementNotFoundException($elementId);
            }

            if ($conn->fetchOne(
                'SELECT 1 FROM milestone WHERE id = :id AND project_id = :project_id',
                ['id' => $milestoneId, 'project_id' => $projectId],
            ) === false) {
                throw new MilestoneNotFoundException($milestoneId);
            }

            $conn->executeStatement(
                'UPDATE element SET archetype = :archetype, updated_at = now() WHERE id = :id',
                ['id' => $elementId, 'archetype' => $archetype],
            );

            /** @var array<string, mixed> $element */
            $element = $conn->fetchAssociative(
                'SELECT id, project_id, parent_id, kind, is_external, archetype, created_at, updated_at FROM element WHERE id = :id',
                ['id' => $elementId],
            );

            /** @var array<string, mixed> $version */
            $version = $conn->fetchAssociative(
                'INSERT INTO element_version (element_id, milestone_id, name, description, technology)
                 VALUES (:element_id, :milestone_id, :name, :description, :technology)
                 ON CONFLICT (element_id, milestone_id) DO UPDATE
                    SET name = EXCLUDED.name, description = EXCLUDED.description, technology = EXCLUDED.technology
                 RETURNING name, description, technology',
                [
                    'element_id' => $elementId,
                    'milestone_id' => $milestoneId,
                    'name' => $name,
                    'description' => $description,
                    'technology' => $technology,
                ],
            );

            return array_merge($element, $version, ['milestone_id' => $milestoneId]);
        });
    }

    public function softDelete(string $elementId, string $milestoneId): array
    {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use ($elementId, $milestoneId): array {
            $projectId = $conn->fetchOne('SELECT project_id FROM element WHERE id = :id', ['id' => $elementId]);

            if ($projectId === false) {
                throw new ElementNotFoundException($elementId);
            }

            if ($conn->fetchOne(
                'SELECT 1 FROM milestone WHERE id = :id AND project_id = :project_id',
                ['id' => $milestoneId, 'project_id' => $projectId],
            ) === false) {
                throw new MilestoneNotFoundException($milestoneId);
            }

            /** @var array<string, mixed> $element */
            $element = $conn->fetchAssociative(
                'UPDATE element SET deleted_at_milestone_id = :milestone_id WHERE id = :id
                 RETURNING id, project_id, parent_id, kind, is_external, archetype,
                           created_at_milestone_id, deleted_at_milestone_id, created_at, updated_at',
                ['id' => $elementId, 'milestone_id' => $milestoneId],
            );

            return $element;
        });
    }

    public function findAllByProject(string $projectId): array
    {
        // Safe as a plain join only because every element currently has exactly one version,
        // created alongside it — this breaks once PATCH introduces multiple versions per element.
        return $this->connection->fetchAllAssociative(
            'SELECT e.id, e.project_id, e.parent_id, e.kind, e.is_external, e.archetype,
                    e.created_at_milestone_id AS milestone_id,
                    v.name, v.description, v.technology, e.created_at, e.updated_at
             FROM element e
             JOIN element_version v ON v.element_id = e.id
             WHERE e.project_id = :project_id
             ORDER BY e.seq ASC',
            ['project_id' => $projectId],
        );
    }

    public function findAllVersionsByProject(string $projectId): array
    {
        /** @var list<array{
         *     id: string, project_id: string, parent_id: string|null, kind: string, is_external: bool|string,
         *     archetype: string|null,
         *     created_at_milestone_id: string, deleted_at_milestone_id: string|null,
         *     version_milestone_id: string, version_milestone_sort_order: int|string,
         *     name: string, description: string|null, technology: string|null,
         * }> $rows
         */
        $rows = $this->connection->fetchAllAssociative(
            'SELECT e.id, e.project_id, e.parent_id, e.kind, e.is_external, e.archetype,
                    e.created_at_milestone_id, e.deleted_at_milestone_id,
                    v.milestone_id AS version_milestone_id, m.sort_order AS version_milestone_sort_order,
                    v.name, v.description, v.technology
             FROM element e
             JOIN element_version v ON v.element_id = e.id
             JOIN milestone m ON m.id = v.milestone_id
             WHERE e.project_id = :project_id
             ORDER BY e.seq ASC, m.sort_order ASC',
            ['project_id' => $projectId],
        );

        return array_map(static fn (array $row): array => [
            'id' => $row['id'],
            'project_id' => $row['project_id'],
            'parent_id' => $row['parent_id'],
            'kind' => $row['kind'],
            'is_external' => (bool) $row['is_external'],
            'archetype' => $row['archetype'],
            'created_at_milestone_id' => $row['created_at_milestone_id'],
            'deleted_at_milestone_id' => $row['deleted_at_milestone_id'],
            'version_milestone_id' => $row['version_milestone_id'],
            'version_milestone_sort_order' => (int) $row['version_milestone_sort_order'],
            'name' => $row['name'],
            'description' => $row['description'],
            'technology' => $row['technology'],
        ], $rows);
    }
}

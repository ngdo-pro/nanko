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
                'INSERT INTO element (project_id, parent_id, kind, is_external, created_at_milestone_id)
                 VALUES (:project_id, :parent_id, :kind, :is_external, :milestone_id)
                 RETURNING id, project_id, parent_id, kind, is_external, created_at, updated_at',
                [
                    'project_id' => $projectId,
                    'parent_id' => $parentId,
                    'kind' => $kind,
                    'is_external' => $isExternal,
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

    public function findAllByProject(string $projectId): array
    {
        // Safe as a plain join only because every element currently has exactly one version,
        // created alongside it — this breaks once PATCH introduces multiple versions per element.
        return $this->connection->fetchAllAssociative(
            'SELECT e.id, e.project_id, e.parent_id, e.kind, e.is_external,
                    e.created_at_milestone_id AS milestone_id,
                    v.name, v.description, v.technology, e.created_at, e.updated_at
             FROM element e
             JOIN element_version v ON v.element_id = e.id
             WHERE e.project_id = :project_id
             ORDER BY e.seq ASC',
            ['project_id' => $projectId],
        );
    }
}

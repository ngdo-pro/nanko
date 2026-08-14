<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;

/**
 * @phpstan-type AnnotationRawRow array{
 *     id: string, project_id: string,
 *     element_id: string|null, relation_id: string|null, scope_element_id: string|null,
 *     x: float|string, y: float|string,
 *     author_name: string, body: string, created_at: string, updated_at: string,
 * }
 */
final class DoctrineAnnotationRepository implements AnnotationRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function create(
        string $projectId,
        ?string $elementId,
        ?string $relationId,
        ?string $scopeElementId,
        float $x,
        float $y,
        string $authorName,
        string $body,
    ): array {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use (
            $projectId,
            $elementId,
            $relationId,
            $scopeElementId,
            $x,
            $y,
            $authorName,
            $body,
        ): array {
            if ($conn->fetchOne('SELECT 1 FROM project WHERE id = :id', ['id' => $projectId]) === false) {
                throw new ProjectNotFoundException($projectId);
            }

            if ($elementId !== null && $conn->fetchOne(
                'SELECT 1 FROM element WHERE id = :id AND project_id = :project_id',
                ['id' => $elementId, 'project_id' => $projectId],
            ) === false) {
                throw new ElementNotFoundException($elementId);
            }

            if ($relationId !== null && $conn->fetchOne(
                'SELECT 1 FROM relation WHERE id = :id AND project_id = :project_id',
                ['id' => $relationId, 'project_id' => $projectId],
            ) === false) {
                throw new RelationNotFoundException($relationId);
            }

            if ($scopeElementId !== null && $conn->fetchOne(
                'SELECT 1 FROM element WHERE id = :id AND project_id = :project_id',
                ['id' => $scopeElementId, 'project_id' => $projectId],
            ) === false) {
                throw new ElementNotFoundException($scopeElementId);
            }

            /** @var AnnotationRawRow $row */
            $row = $conn->fetchAssociative(
                'INSERT INTO annotation (project_id, element_id, relation_id, scope_element_id, x, y, author_name, body)
                 VALUES (:project_id, :element_id, :relation_id, :scope_element_id, :x, :y, :author_name, :body)
                 RETURNING id, project_id, element_id, relation_id, scope_element_id, x, y, author_name, body, created_at, updated_at',
                [
                    'project_id' => $projectId,
                    'element_id' => $elementId,
                    'relation_id' => $relationId,
                    'scope_element_id' => $scopeElementId,
                    'x' => $x,
                    'y' => $y,
                    'author_name' => $authorName,
                    'body' => $body,
                ],
            );

            return self::normalize($row);
        });
    }

    public function update(
        string $annotationId,
        string $authorName,
        string $body,
        float $x,
        float $y,
        ?string $elementId,
        ?string $relationId,
    ): array {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use (
            $annotationId,
            $authorName,
            $body,
            $x,
            $y,
            $elementId,
            $relationId,
        ): array {
            $projectId = $conn->fetchOne('SELECT project_id FROM annotation WHERE id = :id', ['id' => $annotationId]);

            if ($projectId === false) {
                throw new AnnotationNotFoundException($annotationId);
            }

            if ($elementId !== null && $conn->fetchOne(
                'SELECT 1 FROM element WHERE id = :id AND project_id = :project_id',
                ['id' => $elementId, 'project_id' => $projectId],
            ) === false) {
                throw new ElementNotFoundException($elementId);
            }

            if ($relationId !== null && $conn->fetchOne(
                'SELECT 1 FROM relation WHERE id = :id AND project_id = :project_id',
                ['id' => $relationId, 'project_id' => $projectId],
            ) === false) {
                throw new RelationNotFoundException($relationId);
            }

            /** @var AnnotationRawRow $row */
            $row = $conn->fetchAssociative(
                'UPDATE annotation
                 SET author_name = :author_name, body = :body, x = :x, y = :y,
                     element_id = :element_id, relation_id = :relation_id, updated_at = now()
                 WHERE id = :id
                 RETURNING id, project_id, element_id, relation_id, scope_element_id, x, y, author_name, body, created_at, updated_at',
                [
                    'id' => $annotationId,
                    'author_name' => $authorName,
                    'body' => $body,
                    'x' => $x,
                    'y' => $y,
                    'element_id' => $elementId,
                    'relation_id' => $relationId,
                ],
            );

            return self::normalize($row);
        });
    }

    public function delete(string $annotationId): void
    {
        $affected = $this->connection->executeStatement(
            'DELETE FROM annotation WHERE id = :id',
            ['id' => $annotationId],
        );

        if ($affected === 0) {
            throw new AnnotationNotFoundException($annotationId);
        }
    }

    public function findAllByProjectScope(string $projectId, ?string $scopeElementId): array
    {
        /** @var list<AnnotationRawRow> $rows */
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, project_id, element_id, relation_id, scope_element_id, x, y, author_name, body, created_at, updated_at
             FROM annotation
             WHERE project_id = :project_id AND scope_element_id IS NOT DISTINCT FROM :scope_element_id
             ORDER BY created_at ASC',
            ['project_id' => $projectId, 'scope_element_id' => $scopeElementId],
        );

        return array_map(self::normalize(...), $rows);
    }

    /**
     * @param AnnotationRawRow $row
     *
     * @return array{
     *     id: string, project_id: string,
     *     element_id: string|null, relation_id: string|null, scope_element_id: string|null,
     *     x: float, y: float,
     *     author_name: string, body: string, created_at: string, updated_at: string,
     * }
     */
    private static function normalize(array $row): array
    {
        return [
            'id' => $row['id'],
            'project_id' => $row['project_id'],
            'element_id' => $row['element_id'],
            'relation_id' => $row['relation_id'],
            'scope_element_id' => $row['scope_element_id'],
            'x' => (float) $row['x'],
            'y' => (float) $row['y'],
            'author_name' => $row['author_name'],
            'body' => $row['body'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}

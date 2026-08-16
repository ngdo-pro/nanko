<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;

/**
 * @phpstan-type AnnotationRawRow array{
 *     id: string, project_id: string, scope_element_id: string|null,
 *     x: float|string, y: float|string,
 *     author_name: string, body: string,
 *     created_at: string, updated_at: string,
 * }
 * @phpstan-type AnnotationLinkRawRow array{
 *     id: string, annotation_id: string,
 *     element_id: string|null, relation_id: string|null, target_annotation_id: string|null,
 *     source_handle: string|null, target_handle: string|null,
 * }
 * @phpstan-type AnnotationLink array{
 *     id: string,
 *     element_id: string|null, relation_id: string|null, target_annotation_id: string|null,
 *     source_handle: string|null, target_handle: string|null,
 * }
 * @phpstan-type LinkInput array{element_id?: string, relation_id?: string, target_annotation_id?: string, source_handle?: ?string, target_handle?: ?string}
 * @phpstan-type Annotation array{
 *     id: string, project_id: string, scope_element_id: string|null,
 *     x: float, y: float,
 *     author_name: string, body: string,
 *     created_at: string, updated_at: string,
 *     links: list<AnnotationLink>,
 * }
 */
final class DoctrineAnnotationRepository implements AnnotationRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function create(
        string $projectId,
        ?string $scopeElementId,
        float $x,
        float $y,
        string $authorName,
        string $body,
        array $links = [],
    ): array {
        /** @var Annotation */
        return $this->connection->transactional(function (Connection $conn) use (
            $projectId,
            $scopeElementId,
            $x,
            $y,
            $authorName,
            $body,
            $links,
        ): array {
            if ($conn->fetchOne('SELECT 1 FROM project WHERE id = :id', ['id' => $projectId]) === false) {
                throw new ProjectNotFoundException($projectId);
            }

            if ($scopeElementId !== null && $conn->fetchOne(
                'SELECT 1 FROM element WHERE id = :id AND project_id = :project_id',
                ['id' => $scopeElementId, 'project_id' => $projectId],
            ) === false) {
                throw new ElementNotFoundException($scopeElementId);
            }

            /** @var AnnotationRawRow $row */
            $row = $conn->fetchAssociative(
                'INSERT INTO annotation (project_id, scope_element_id, x, y, author_name, body)
                 VALUES (:project_id, :scope_element_id, :x, :y, :author_name, :body)
                 RETURNING id, project_id, scope_element_id, x, y, author_name, body, created_at, updated_at',
                [
                    'project_id' => $projectId,
                    'scope_element_id' => $scopeElementId,
                    'x' => $x,
                    'y' => $y,
                    'author_name' => $authorName,
                    'body' => $body,
                ],
            );

            $this->insertLinks($conn, $row['id'], $projectId, $links);

            return self::normalize($row, $this->fetchLinks($conn, $row['id']));
        });
    }

    public function update(
        string $annotationId,
        string $authorName,
        string $body,
        float $x,
        float $y,
        array $links = [],
    ): array {
        /** @var Annotation */
        return $this->connection->transactional(function (Connection $conn) use (
            $annotationId,
            $authorName,
            $body,
            $x,
            $y,
            $links,
        ): array {
            $projectId = $conn->fetchOne('SELECT project_id FROM annotation WHERE id = :id', ['id' => $annotationId]);

            if (!is_string($projectId)) {
                throw new AnnotationNotFoundException($annotationId);
            }

            /** @var AnnotationRawRow $row */
            $row = $conn->fetchAssociative(
                'UPDATE annotation
                 SET author_name = :author_name, body = :body, x = :x, y = :y, updated_at = now()
                 WHERE id = :id
                 RETURNING id, project_id, scope_element_id, x, y, author_name, body, created_at, updated_at',
                [
                    'id' => $annotationId,
                    'author_name' => $authorName,
                    'body' => $body,
                    'x' => $x,
                    'y' => $y,
                ],
            );

            $conn->executeStatement('DELETE FROM annotation_link WHERE annotation_id = :id', ['id' => $annotationId]);

            $this->insertLinks($conn, $annotationId, $projectId, $links);

            return self::normalize($row, $this->fetchLinks($conn, $annotationId));
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
            'SELECT id, project_id, scope_element_id, x, y, author_name, body, created_at, updated_at
             FROM annotation
             WHERE project_id = :project_id AND scope_element_id IS NOT DISTINCT FROM :scope_element_id
             ORDER BY created_at ASC',
            ['project_id' => $projectId, 'scope_element_id' => $scopeElementId],
        );

        if ($rows === []) {
            return [];
        }

        $annotationIds = array_map(static fn (array $row): string => $row['id'], $rows);

        /** @var list<AnnotationLinkRawRow> $linkRows */
        $linkRows = $this->connection->fetchAllAssociative(
            'SELECT id, annotation_id, element_id, relation_id, target_annotation_id, source_handle, target_handle
             FROM annotation_link
             WHERE annotation_id IN (:annotation_ids)
             ORDER BY created_at ASC',
            ['annotation_ids' => $annotationIds],
            ['annotation_ids' => ArrayParameterType::STRING],
        );

        /** @var array<string, list<AnnotationLink>> $linksByAnnotationId */
        $linksByAnnotationId = [];
        foreach ($linkRows as $linkRow) {
            $linksByAnnotationId[$linkRow['annotation_id']][] = self::normalizeLink($linkRow);
        }

        return array_map(
            static fn (array $row): array => self::normalize($row, $linksByAnnotationId[$row['id']] ?? []),
            $rows,
        );
    }

    /**
     * Validates and inserts every entry of $links for $annotationId, in the same
     * transaction as the caller. A repeated entry (same annotation_id/element_id/
     * relation_id/target_annotation_id triple) is silently deduped at the DB level
     * via ON CONFLICT DO NOTHING against the table's UNIQUE NULLS NOT DISTINCT
     * constraint — not an error.
     *
     * @param list<LinkInput> $links
     *
     * @throws ElementNotFoundException if a link's element_id does not exist in $projectId
     * @throws RelationNotFoundException if a link's relation_id does not exist in $projectId
     * @throws InvalidAnnotationLinkException if a link is a self-link, or its target_annotation_id does not exist in $projectId
     */
    private function insertLinks(Connection $conn, string $annotationId, string $projectId, array $links): void
    {
        foreach ($links as $link) {
            $elementId = $link['element_id'] ?? null;
            $relationId = $link['relation_id'] ?? null;
            $targetAnnotationId = $link['target_annotation_id'] ?? null;
            $sourceHandle = $link['source_handle'] ?? null;
            $targetHandle = $link['target_handle'] ?? null;

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

            if ($targetAnnotationId !== null) {
                if ($targetAnnotationId === $annotationId) {
                    throw InvalidAnnotationLinkException::selfLink($annotationId);
                }

                if ($conn->fetchOne(
                    'SELECT 1 FROM annotation WHERE id = :id AND project_id = :project_id',
                    ['id' => $targetAnnotationId, 'project_id' => $projectId],
                ) === false) {
                    throw InvalidAnnotationLinkException::unknownTargetAnnotation($targetAnnotationId);
                }
            }

            $conn->executeStatement(
                'INSERT INTO annotation_link (annotation_id, element_id, relation_id, target_annotation_id, source_handle, target_handle)
                 VALUES (:annotation_id, :element_id, :relation_id, :target_annotation_id, :source_handle, :target_handle)
                 ON CONFLICT (annotation_id, element_id, relation_id, target_annotation_id) DO NOTHING',
                [
                    'annotation_id' => $annotationId,
                    'element_id' => $elementId,
                    'relation_id' => $relationId,
                    'target_annotation_id' => $targetAnnotationId,
                    'source_handle' => $sourceHandle,
                    'target_handle' => $targetHandle,
                ],
            );
        }
    }

    /**
     * @return list<AnnotationLink>
     */
    private function fetchLinks(Connection $conn, string $annotationId): array
    {
        /** @var list<AnnotationLinkRawRow> $rows */
        $rows = $conn->fetchAllAssociative(
            'SELECT id, annotation_id, element_id, relation_id, target_annotation_id, source_handle, target_handle
             FROM annotation_link
             WHERE annotation_id = :annotation_id
             ORDER BY created_at ASC',
            ['annotation_id' => $annotationId],
        );

        return array_map(self::normalizeLink(...), $rows);
    }

    /**
     * @param AnnotationRawRow  $row
     * @param list<AnnotationLink> $links
     *
     * @return array{
     *     id: string, project_id: string, scope_element_id: string|null,
     *     x: float, y: float,
     *     author_name: string, body: string,
     *     created_at: string, updated_at: string,
     *     links: list<AnnotationLink>,
     * }
     */
    private static function normalize(array $row, array $links): array
    {
        return [
            'id' => $row['id'],
            'project_id' => $row['project_id'],
            'scope_element_id' => $row['scope_element_id'],
            'x' => (float) $row['x'],
            'y' => (float) $row['y'],
            'author_name' => $row['author_name'],
            'body' => $row['body'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'links' => $links,
        ];
    }

    /**
     * @param AnnotationLinkRawRow $row
     *
     * @return AnnotationLink
     */
    private static function normalizeLink(array $row): array
    {
        return [
            'id' => $row['id'],
            'element_id' => $row['element_id'],
            'relation_id' => $row['relation_id'],
            'target_annotation_id' => $row['target_annotation_id'],
            'source_handle' => $row['source_handle'],
            'target_handle' => $row['target_handle'],
        ];
    }
}

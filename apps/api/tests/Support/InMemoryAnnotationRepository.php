<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\AnnotationNotFoundException;
use App\Repository\AnnotationRepositoryInterface;
use App\Repository\ElementNotFoundException;
use App\Repository\InvalidAnnotationLinkException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationNotFoundException;

final class InMemoryAnnotationRepository implements AnnotationRepositoryInterface
{
    /** @var array<string, true> */
    private array $projectIds = [];

    /** @var array<string, string> element id => project id */
    private array $elementProjectIds = [];

    /** @var array<string, string> relation id => project id */
    private array $relationProjectIds = [];

    /** @var array<string, string> annotation id => project id, for annotations created elsewhere and registered as valid link targets */
    private array $registeredAnnotationProjectIds = [];

    /**
     * @var array<string, array{
     *     id: string, project_id: string, scope_element_id: string|null,
     *     x: float, y: float,
     *     author_name: string, body: string,
     *     created_at: string, updated_at: string,
     * }> annotation id => row
     */
    private array $annotationsById = [];

    /**
     * @var array<string, list<array{
     *     id: string,
     *     element_id: string|null, relation_id: string|null, target_annotation_id: string|null,
     *     source_handle: string|null, target_handle: string|null,
     * }>> annotation id => its links
     */
    private array $linksByAnnotationId = [];

    public function registerProject(string $projectId): void
    {
        $this->projectIds[$projectId] = true;
    }

    public function registerElement(string $elementId, string $projectId): void
    {
        $this->elementProjectIds[$elementId] = $projectId;
    }

    public function registerRelation(string $relationId, string $projectId): void
    {
        $this->relationProjectIds[$relationId] = $projectId;
    }

    /**
     * Registers an annotation id as a valid target_annotation_id link target belonging to
     * $projectId — annotations created through this repository's own create()/update() are
     * already valid targets automatically; this is for annotations set up by another fixture.
     */
    public function registerAnnotation(string $annotationId, string $projectId): void
    {
        $this->registeredAnnotationProjectIds[$annotationId] = $projectId;
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
        if (!isset($this->projectIds[$projectId])) {
            throw new ProjectNotFoundException($projectId);
        }

        if ($scopeElementId !== null && ($this->elementProjectIds[$scopeElementId] ?? null) !== $projectId) {
            throw new ElementNotFoundException($scopeElementId);
        }

        $now = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');
        $id = self::uuidV4();

        $annotation = [
            'id' => $id,
            'project_id' => $projectId,
            'scope_element_id' => $scopeElementId,
            'x' => $x,
            'y' => $y,
            'author_name' => $authorName,
            'body' => $body,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $this->annotationsById[$id] = $annotation;
        $this->registeredAnnotationProjectIds[$id] = $projectId;
        $this->linksByAnnotationId[$id] = $this->buildLinks($id, $projectId, $links);

        return [...$annotation, 'links' => $this->linksByAnnotationId[$id]];
    }

    public function update(
        string $annotationId,
        string $authorName,
        string $body,
        float $x,
        float $y,
        array $links = [],
    ): array {
        if (!isset($this->annotationsById[$annotationId])) {
            throw new AnnotationNotFoundException($annotationId);
        }

        $projectId = $this->annotationsById[$annotationId]['project_id'];

        $updated = $this->annotationsById[$annotationId];
        $updated['author_name'] = $authorName;
        $updated['body'] = $body;
        $updated['x'] = $x;
        $updated['y'] = $y;
        $updated['updated_at'] = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');

        $this->annotationsById[$annotationId] = $updated;
        $this->linksByAnnotationId[$annotationId] = $this->buildLinks($annotationId, $projectId, $links);

        return [...$updated, 'links' => $this->linksByAnnotationId[$annotationId]];
    }

    public function delete(string $annotationId): void
    {
        if (!isset($this->annotationsById[$annotationId])) {
            throw new AnnotationNotFoundException($annotationId);
        }

        unset($this->annotationsById[$annotationId], $this->linksByAnnotationId[$annotationId]);

        // Cascade: drop any other annotation's links that pointed at the deleted note.
        foreach ($this->linksByAnnotationId as $otherAnnotationId => $links) {
            $this->linksByAnnotationId[$otherAnnotationId] = array_values(array_filter(
                $links,
                static fn (array $link): bool => $link['target_annotation_id'] !== $annotationId,
            ));
        }
    }

    public function findAllByProjectScope(string $projectId, ?string $scopeElementId): array
    {
        $annotations = array_values(array_filter(
            $this->annotationsById,
            fn (array $annotation): bool => $annotation['project_id'] === $projectId
                && $annotation['scope_element_id'] === $scopeElementId,
        ));

        return array_map(
            fn (array $annotation): array => [...$annotation, 'links' => $this->linksByAnnotationId[$annotation['id']] ?? []],
            $annotations,
        );
    }

    /**
     * Validates every entry of $links for $annotationId and returns the deduped, persisted
     * list — mirrors DoctrineAnnotationRepository's existence checks, self-link rejection, and
     * silent dedupe (a repeated element_id/relation_id/target_annotation_id entry is dropped,
     * not an error).
     *
     * @param list<array{element_id?: string, relation_id?: string, target_annotation_id?: string, source_handle?: ?string, target_handle?: ?string}> $links
     *
     * @return list<array{
     *     id: string,
     *     element_id: string|null, relation_id: string|null, target_annotation_id: string|null,
     *     source_handle: string|null, target_handle: string|null,
     * }>
     */
    private function buildLinks(string $annotationId, string $projectId, array $links): array
    {
        $built = [];
        $seen = [];

        foreach ($links as $link) {
            $elementId = $link['element_id'] ?? null;
            $relationId = $link['relation_id'] ?? null;
            $targetAnnotationId = $link['target_annotation_id'] ?? null;
            $sourceHandle = $link['source_handle'] ?? null;
            $targetHandle = $link['target_handle'] ?? null;

            if ($elementId !== null && ($this->elementProjectIds[$elementId] ?? null) !== $projectId) {
                throw new ElementNotFoundException($elementId);
            }

            if ($relationId !== null && ($this->relationProjectIds[$relationId] ?? null) !== $projectId) {
                throw new RelationNotFoundException($relationId);
            }

            if ($targetAnnotationId !== null) {
                if ($targetAnnotationId === $annotationId) {
                    throw InvalidAnnotationLinkException::selfLink($annotationId);
                }

                if (($this->registeredAnnotationProjectIds[$targetAnnotationId] ?? null) !== $projectId) {
                    throw InvalidAnnotationLinkException::unknownTargetAnnotation($targetAnnotationId);
                }
            }

            $key = ($elementId ?? '') . '|' . ($relationId ?? '') . '|' . ($targetAnnotationId ?? '');
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $built[] = [
                'id' => self::uuidV4(),
                'element_id' => $elementId,
                'relation_id' => $relationId,
                'target_annotation_id' => $targetAnnotationId,
                'source_handle' => $sourceHandle,
                'target_handle' => $targetHandle,
            ];
        }

        return $built;
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

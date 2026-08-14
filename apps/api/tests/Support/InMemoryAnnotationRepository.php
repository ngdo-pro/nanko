<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\AnnotationNotFoundException;
use App\Repository\AnnotationRepositoryInterface;
use App\Repository\ElementNotFoundException;
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

    /**
     * @var array<string, array{
     *     id: string, project_id: string,
     *     element_id: string|null, relation_id: string|null, scope_element_id: string|null,
     *     x: float, y: float,
     *     author_name: string, body: string, created_at: string, updated_at: string,
     * }> annotation id => row
     */
    private array $annotationsById = [];

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
        if (!isset($this->projectIds[$projectId])) {
            throw new ProjectNotFoundException($projectId);
        }

        if ($elementId !== null && ($this->elementProjectIds[$elementId] ?? null) !== $projectId) {
            throw new ElementNotFoundException($elementId);
        }

        if ($relationId !== null && ($this->relationProjectIds[$relationId] ?? null) !== $projectId) {
            throw new RelationNotFoundException($relationId);
        }

        if ($scopeElementId !== null && ($this->elementProjectIds[$scopeElementId] ?? null) !== $projectId) {
            throw new ElementNotFoundException($scopeElementId);
        }

        $now = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');

        $annotation = [
            'id' => self::uuidV4(),
            'project_id' => $projectId,
            'element_id' => $elementId,
            'relation_id' => $relationId,
            'scope_element_id' => $scopeElementId,
            'x' => $x,
            'y' => $y,
            'author_name' => $authorName,
            'body' => $body,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $this->annotationsById[$annotation['id']] = $annotation;

        return $annotation;
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
        if (!isset($this->annotationsById[$annotationId])) {
            throw new AnnotationNotFoundException($annotationId);
        }

        $projectId = $this->annotationsById[$annotationId]['project_id'];

        if ($elementId !== null && ($this->elementProjectIds[$elementId] ?? null) !== $projectId) {
            throw new ElementNotFoundException($elementId);
        }

        if ($relationId !== null && ($this->relationProjectIds[$relationId] ?? null) !== $projectId) {
            throw new RelationNotFoundException($relationId);
        }

        $updated = $this->annotationsById[$annotationId];
        $updated['author_name'] = $authorName;
        $updated['body'] = $body;
        $updated['x'] = $x;
        $updated['y'] = $y;
        $updated['element_id'] = $elementId;
        $updated['relation_id'] = $relationId;
        $updated['updated_at'] = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');

        $this->annotationsById[$annotationId] = $updated;

        return $updated;
    }

    public function delete(string $annotationId): void
    {
        if (!isset($this->annotationsById[$annotationId])) {
            throw new AnnotationNotFoundException($annotationId);
        }

        unset($this->annotationsById[$annotationId]);
    }

    public function findAllByProjectScope(string $projectId, ?string $scopeElementId): array
    {
        return array_values(array_filter(
            $this->annotationsById,
            static fn (array $annotation): bool => $annotation['project_id'] === $projectId
                && $annotation['scope_element_id'] === $scopeElementId,
        ));
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

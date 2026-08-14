<?php

declare(strict_types=1);

namespace App\Repository;

interface AnnotationRepositoryInterface
{
    /**
     * @return array<string, mixed>
     *
     * @throws ProjectNotFoundException
     * @throws ElementNotFoundException if $elementId or $scopeElementId does not exist
     * @throws RelationNotFoundException if $relationId does not exist
     */
    public function create(
        string $projectId,
        ?string $elementId,
        ?string $relationId,
        ?string $scopeElementId,
        float $x,
        float $y,
        string $authorName,
        string $body,
    ): array;

    /**
     * Wholesale update of the note's text, position, and link — mirrors
     * DoctrineElementRepository::update()'s archetype handling: callers
     * always pass every field back, even the ones that didn't change.
     * Passing null for both $elementId and $relationId clears any existing link.
     *
     * @return array<string, mixed>
     *
     * @throws AnnotationNotFoundException
     * @throws ElementNotFoundException if $elementId does not exist in the annotation's project
     * @throws RelationNotFoundException if $relationId does not exist in the annotation's project
     */
    public function update(
        string $annotationId,
        string $authorName,
        string $body,
        float $x,
        float $y,
        ?string $elementId,
        ?string $relationId,
    ): array;

    /**
     * @throws AnnotationNotFoundException
     */
    public function delete(string $annotationId): void;

    /**
     * @return list<array{
     *     id: string,
     *     project_id: string,
     *     element_id: string|null,
     *     relation_id: string|null,
     *     scope_element_id: string|null,
     *     x: float,
     *     y: float,
     *     author_name: string,
     *     body: string,
     *     created_at: string,
     *     updated_at: string,
     * }>
     */
    public function findAllByProjectScope(string $projectId, ?string $scopeElementId): array;
}

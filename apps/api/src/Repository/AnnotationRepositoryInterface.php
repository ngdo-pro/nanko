<?php

declare(strict_types=1);

namespace App\Repository;

/**
 * @phpstan-type LinkInput array{element_id?: string, relation_id?: string, target_annotation_id?: string, source_handle?: ?string, target_handle?: ?string}
 * @phpstan-type AnnotationLink array{
 *     id: string,
 *     element_id: string|null, relation_id: string|null, target_annotation_id: string|null,
 *     source_handle: string|null, target_handle: string|null,
 * }
 * @phpstan-type Annotation array{
 *     id: string,
 *     project_id: string,
 *     scope_element_id: string|null,
 *     x: float,
 *     y: float,
 *     author_name: string,
 *     body: string,
 *     created_at: string,
 *     updated_at: string,
 *     links: list<AnnotationLink>,
 * }
 */
interface AnnotationRepositoryInterface
{
    /**
     * @param list<LinkInput> $links
     *
     * @return Annotation
     *
     * @throws ProjectNotFoundException
     * @throws ElementNotFoundException if $scopeElementId or a link's element_id does not exist
     * @throws RelationNotFoundException if a link's relation_id does not exist
     * @throws InvalidAnnotationLinkException if a link's target_annotation_id does not exist
     */
    public function create(
        string $projectId,
        ?string $scopeElementId,
        float $x,
        float $y,
        string $authorName,
        string $body,
        array $links = [],
    ): array;

    /**
     * Wholesale update of the note's text, position, and links — mirrors
     * DoctrineElementRepository::update()'s archetype handling: callers
     * always pass every field back, even the ones that didn't change.
     * $links fully replaces the annotation's existing links; an empty array clears them all.
     *
     * @param list<LinkInput> $links
     *
     * @return Annotation
     *
     * @throws AnnotationNotFoundException
     * @throws ElementNotFoundException if a link's element_id does not exist in the annotation's project
     * @throws RelationNotFoundException if a link's relation_id does not exist in the annotation's project
     * @throws InvalidAnnotationLinkException if a link is a self-link, or its target_annotation_id does not exist
     */
    public function update(
        string $annotationId,
        string $authorName,
        string $body,
        float $x,
        float $y,
        array $links = [],
    ): array;

    /**
     * @throws AnnotationNotFoundException
     */
    public function delete(string $annotationId): void;

    /**
     * @return list<Annotation>
     */
    public function findAllByProjectScope(string $projectId, ?string $scopeElementId): array;
}

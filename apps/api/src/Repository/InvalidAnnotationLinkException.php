<?php

declare(strict_types=1);

namespace App\Repository;

/**
 * Thrown when an annotation link entry is well-formed (exactly one of
 * element_id/relation_id/target_annotation_id) but disallowed at the data
 * level — a note pointing at itself, or at a target_annotation_id that
 * doesn't exist. Distinct from AnnotationNotFoundException (which is about
 * the annotation *being acted on*, not one of its link targets) so the
 * controller can map it to a 422 rather than a 404.
 */
final class InvalidAnnotationLinkException extends \RuntimeException
{
    private function __construct(string $message)
    {
        parent::__construct($message);
    }

    public static function selfLink(string $annotationId): self
    {
        return new self(sprintf('Annotation "%s" cannot link to itself.', $annotationId));
    }

    public static function unknownTargetAnnotation(string $targetAnnotationId): self
    {
        return new self(sprintf('No annotation with id "%s" exists to link to.', $targetAnnotationId));
    }
}

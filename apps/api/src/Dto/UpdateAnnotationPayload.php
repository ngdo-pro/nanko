<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

#[Assert\Callback('validate')]
final class UpdateAnnotationPayload
{
    #[SerializedName('author_name')]
    #[Assert\NotBlank]
    public readonly string $authorName;

    #[Assert\NotBlank]
    public readonly string $body;

    #[Assert\NotNull]
    public readonly ?float $x;

    #[Assert\NotNull]
    public readonly ?float $y;

    private const HANDLES = ['top', 'right', 'bottom', 'left', 'center'];

    /**
     * @var list<array{element_id?: string, relation_id?: string, target_annotation_id?: string, source_handle?: ?string, target_handle?: ?string}>
     */
    public readonly array $links;

    /**
     * @param list<array{element_id?: string, relation_id?: string, target_annotation_id?: string, source_handle?: ?string, target_handle?: ?string}> $links
     */
    public function __construct(
        string $authorName = '',
        string $body = '',
        ?float $x = null,
        ?float $y = null,
        array $links = [],
    ) {
        $this->authorName = trim($authorName);
        $this->body = trim($body);
        $this->x = $x;
        $this->y = $y;

        $this->links = $links;
    }

    public function validate(ExecutionContextInterface $context): void
    {
        // Self-link (target_annotation_id equal to the annotation's own id) can't be checked
        // here — this DTO has no id field (consistent with existing precedent) — the repository
        // checks it instead, since it has the id.
        foreach ($this->links as $index => $link) {
            $elementId = $link['element_id'] ?? null;
            $relationId = $link['relation_id'] ?? null;
            $targetAnnotationId = $link['target_annotation_id'] ?? null;

            $targetCount = ($elementId !== null ? 1 : 0)
                + ($relationId !== null ? 1 : 0)
                + ($targetAnnotationId !== null ? 1 : 0);

            if ($targetCount !== 1) {
                $context->buildViolation('each link must reference exactly one of element_id, relation_id, or target_annotation_id')
                    ->atPath("links[{$index}]")
                    ->addViolation();
            }

            $sourceHandle = $link['source_handle'] ?? null;
            if ($sourceHandle !== null && !in_array($sourceHandle, self::HANDLES, true)) {
                $context->buildViolation('invalid source_handle')
                    ->atPath("links[{$index}].source_handle")
                    ->addViolation();
            }

            $targetHandle = $link['target_handle'] ?? null;
            if ($targetHandle !== null && !in_array($targetHandle, self::HANDLES, true)) {
                $context->buildViolation('invalid target_handle')
                    ->atPath("links[{$index}].target_handle")
                    ->addViolation();
            }
        }
    }
}

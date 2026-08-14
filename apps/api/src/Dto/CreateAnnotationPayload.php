<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

#[Assert\Callback('validate')]
final class CreateAnnotationPayload
{
    #[SerializedName('element_id')]
    public readonly ?string $elementId;

    #[SerializedName('relation_id')]
    public readonly ?string $relationId;

    #[SerializedName('scope_element_id')]
    public readonly ?string $scopeElementId;

    #[Assert\NotNull]
    public readonly ?float $x;

    #[Assert\NotNull]
    public readonly ?float $y;

    #[SerializedName('author_name')]
    #[Assert\NotBlank]
    public readonly string $authorName;

    #[Assert\NotBlank]
    public readonly string $body;

    public function __construct(
        ?string $elementId = null,
        ?string $relationId = null,
        ?string $scopeElementId = null,
        ?float $x = null,
        ?float $y = null,
        string $authorName = '',
        string $body = '',
    ) {
        $elementId = $elementId !== null ? trim($elementId) : null;
        $this->elementId = $elementId === '' ? null : $elementId;

        $relationId = $relationId !== null ? trim($relationId) : null;
        $this->relationId = $relationId === '' ? null : $relationId;

        $scopeElementId = $scopeElementId !== null ? trim($scopeElementId) : null;
        $this->scopeElementId = $scopeElementId === '' ? null : $scopeElementId;

        $this->x = $x;
        $this->y = $y;

        $this->authorName = trim($authorName);
        $this->body = trim($body);
    }

    public function validate(ExecutionContextInterface $context): void
    {
        // A note may point at an element or a relation (for a future arrow
        // link), but never both — mirrors the database's CHECK constraint,
        // enforced here first so a mismatch is a 422, not a raw DB failure.
        if ($this->elementId !== null && $this->relationId !== null) {
            $context->buildViolation('an annotation cannot be linked to both an element and a relation')
                ->atPath('element_id')
                ->addViolation();
        }
    }
}

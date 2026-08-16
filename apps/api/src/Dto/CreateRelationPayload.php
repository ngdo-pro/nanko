<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class CreateRelationPayload
{
    #[SerializedName('milestone_id')]
    #[Assert\NotBlank]
    public readonly string $milestoneId;

    #[SerializedName('source_element_id')]
    #[Assert\NotBlank]
    public readonly string $sourceElementId;

    #[SerializedName('target_element_id')]
    #[Assert\NotBlank]
    public readonly string $targetElementId;

    public readonly ?string $label;

    public readonly ?string $technology;

    private const HANDLES = ['top', 'right', 'bottom', 'left', 'center'];

    #[SerializedName('source_handle')]
    #[Assert\Choice(choices: self::HANDLES)]
    public readonly ?string $sourceHandle;

    #[SerializedName('target_handle')]
    #[Assert\Choice(choices: self::HANDLES)]
    public readonly ?string $targetHandle;

    public function __construct(
        string $milestoneId = '',
        string $sourceElementId = '',
        string $targetElementId = '',
        ?string $label = null,
        ?string $technology = null,
        ?string $sourceHandle = null,
        ?string $targetHandle = null,
    ) {
        $this->milestoneId = trim($milestoneId);
        $this->sourceElementId = trim($sourceElementId);
        $this->targetElementId = trim($targetElementId);

        $label = $label !== null ? trim($label) : null;
        $this->label = $label === '' ? null : $label;

        $technology = $technology !== null ? trim($technology) : null;
        $this->technology = $technology === '' ? null : $technology;

        $this->sourceHandle = $sourceHandle;
        $this->targetHandle = $targetHandle;
    }
}

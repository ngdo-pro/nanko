<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class UpdateRelationPayload
{
    #[SerializedName('milestone_id')]
    #[Assert\NotBlank]
    public readonly string $milestoneId;

    public readonly ?string $label;

    public readonly ?string $technology;

    public function __construct(
        string $milestoneId = '',
        ?string $label = null,
        ?string $technology = null,
    ) {
        $this->milestoneId = trim($milestoneId);

        $label = $label !== null ? trim($label) : null;
        $this->label = $label === '' ? null : $label;

        $technology = $technology !== null ? trim($technology) : null;
        $this->technology = $technology === '' ? null : $technology;
    }
}

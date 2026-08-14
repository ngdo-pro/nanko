<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class UpdateElementPayload
{
    #[SerializedName('milestone_id')]
    #[Assert\NotBlank]
    public readonly string $milestoneId;

    #[Assert\NotBlank]
    public readonly string $name;

    public readonly ?string $description;

    public readonly ?string $technology;

    #[Assert\Choice(choices: ['service', 'database', 'queue'])]
    public readonly ?string $archetype;

    public function __construct(
        string $milestoneId = '',
        string $name = '',
        ?string $description = null,
        ?string $technology = null,
        ?string $archetype = null,
    ) {
        $this->milestoneId = trim($milestoneId);
        $this->name = trim($name);

        $description = $description !== null ? trim($description) : null;
        $this->description = $description === '' ? null : $description;

        $technology = $technology !== null ? trim($technology) : null;
        $this->technology = $technology === '' ? null : $technology;

        $archetype = $archetype !== null ? trim($archetype) : null;
        $this->archetype = $archetype === '' ? null : $archetype;
    }
}

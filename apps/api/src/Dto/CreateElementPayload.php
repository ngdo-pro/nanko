<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class CreateElementPayload
{
    #[SerializedName('milestone_id')]
    #[Assert\NotBlank]
    public readonly string $milestoneId;

    #[Assert\NotBlank]
    #[Assert\Choice(choices: ['system', 'container', 'component'])]
    public readonly string $kind;

    #[SerializedName('parent_id')]
    public readonly ?string $parentId;

    #[Assert\NotBlank]
    public readonly string $name;

    public readonly ?string $description;

    public readonly ?string $technology;

    #[SerializedName('is_external')]
    public readonly bool $isExternal;

    #[Assert\Choice(choices: ['service', 'database', 'queue'])]
    public readonly ?string $archetype;

    public function __construct(
        string $milestoneId = '',
        string $kind = '',
        ?string $parentId = null,
        string $name = '',
        ?string $description = null,
        ?string $technology = null,
        bool $isExternal = false,
        ?string $archetype = null,
    ) {
        $this->milestoneId = trim($milestoneId);
        $this->kind = $kind;

        $parentId = $parentId !== null ? trim($parentId) : null;
        $this->parentId = $parentId === '' ? null : $parentId;

        $this->name = trim($name);

        $description = $description !== null ? trim($description) : null;
        $this->description = $description === '' ? null : $description;

        $technology = $technology !== null ? trim($technology) : null;
        $this->technology = $technology === '' ? null : $technology;

        $this->isExternal = $isExternal;

        $archetype = $archetype !== null ? trim($archetype) : null;
        $this->archetype = $archetype === '' ? null : $archetype;
    }
}

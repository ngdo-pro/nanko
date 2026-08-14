<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class DeleteRelationPayload
{
    #[SerializedName('milestone_id')]
    #[Assert\NotBlank]
    public readonly string $milestoneId;

    public function __construct(string $milestoneId = '')
    {
        $this->milestoneId = trim($milestoneId);
    }
}

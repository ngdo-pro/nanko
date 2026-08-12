<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class PositionPayload
{
    #[SerializedName('milestone_id')]
    public readonly ?string $milestoneId;

    #[Assert\NotNull]
    public readonly ?float $x;

    #[Assert\NotNull]
    public readonly ?float $y;

    public function __construct(?string $milestoneId = null, ?float $x = null, ?float $y = null)
    {
        $milestoneId = $milestoneId !== null ? trim($milestoneId) : null;
        $this->milestoneId = $milestoneId === '' ? null : $milestoneId;

        $this->x = $x;
        $this->y = $y;
    }
}

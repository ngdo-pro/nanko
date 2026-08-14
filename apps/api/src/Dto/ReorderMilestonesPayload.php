<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class ReorderMilestonesPayload
{
    /** @var list<string> */
    #[SerializedName('milestone_ids')]
    #[Assert\Count(min: 1, minMessage: 'milestone_ids must not be empty')]
    #[Assert\All([new Assert\NotBlank()])]
    public readonly array $milestoneIds;

    /**
     * @param list<string> $milestoneIds
     */
    public function __construct(array $milestoneIds = [])
    {
        $this->milestoneIds = $milestoneIds;
    }
}

<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

final class CreateMilestonePayload
{
    #[Assert\NotBlank]
    public readonly string $label;

    #[SerializedName('occurs_on')]
    #[Assert\Regex(pattern: '/^\d{4}-\d{2}-\d{2}$/', message: 'occurs_on must be a YYYY-MM-DD date')]
    public readonly ?string $occursOn;

    public function __construct(string $label = '', ?string $occursOn = null)
    {
        $this->label = trim($label);

        $occursOn = $occursOn !== null ? trim($occursOn) : null;
        $this->occursOn = $occursOn === '' ? null : $occursOn;
    }
}

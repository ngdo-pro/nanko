<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class CreateProjectPayload
{
    #[Assert\NotBlank]
    public readonly string $name;

    #[Assert\NotBlank]
    #[Assert\Regex(pattern: '/^[a-z0-9]+(-[a-z0-9]+)*$/', message: 'slug must be lowercase, alphanumeric, dash-separated')]
    public readonly string $slug;

    public function __construct(string $name = '', string $slug = '')
    {
        $this->name = trim($name);
        $this->slug = trim($slug);
    }
}

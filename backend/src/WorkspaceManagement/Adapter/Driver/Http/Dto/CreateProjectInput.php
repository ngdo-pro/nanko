<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateProjectInput
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le nom ne peut pas être vide.')]
        #[Assert\Length(
            min: 2,
            max: 100,
            minMessage: 'Le nom doit comporter au moins 2 caractères.',
            maxMessage: 'Nom trop long',
        )]
        public string $name,
        #[Assert\NotBlank(message: 'Le slug ne peut pas être vide.')]
        #[Assert\Regex(
            pattern: '/^[a-z0-9-]+$/',
            message: 'Le slug ne peut contenir que des minuscules, chiffres et tirets',
        )]
        public string $slug,
    ) {}
}

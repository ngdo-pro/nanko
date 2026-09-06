<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateDocumentInput
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le nom du document est obligatoire.')]
        #[Assert\Length(min: 2, max: 255, minMessage: 'Le nom doit comporter au moins 2 caractères.')]
        public string $name,
        #[Assert\NotBlank(message: 'Le slug est obligatoire.')]
        #[Assert\Length(min: 2, max: 100)]
        #[Assert\Regex(pattern: '/^[a-z0-9-]+$/', message: 'Le slug ne peut contenir que des minuscules, chiffres et tirets.')]
        public string $slug,
        #[Assert\NotNull(message: 'Le layer est obligatoire.')]
        #[Assert\Type(type: 'integer', message: 'Le layer doit être un entier.')]
        public int $layer = 0,
    ) {}
}

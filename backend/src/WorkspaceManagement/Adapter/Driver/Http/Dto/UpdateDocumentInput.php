<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateDocumentInput
{
    public function __construct(
        #[Assert\NotNull(message: 'Le code source ne peut pas être nul.')]
        public string $sourceCode,
    ) {}
}

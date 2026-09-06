<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document\Parser;

final class InvalidNankoSyntaxException extends \DomainException
{
    public function __construct(
        public readonly int $syntaxLine,
        public readonly string $errorMessage,
    ) {
        parent::__construct(sprintf('Erreur de syntaxe .nanko à la ligne %d : %s', $syntaxLine, $errorMessage));
    }
}

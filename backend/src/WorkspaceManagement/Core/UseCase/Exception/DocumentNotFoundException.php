<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\Exception;

final class DocumentNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Document introuvable.')
    {
        parent::__construct($message);
    }
}

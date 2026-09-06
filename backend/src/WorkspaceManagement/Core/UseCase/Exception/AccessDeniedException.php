<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\Exception;

final class AccessDeniedException extends \RuntimeException
{
    public function __construct(string $message = "Vous n'avez pas accès à cette organisation.")
    {
        parent::__construct($message);
    }
}

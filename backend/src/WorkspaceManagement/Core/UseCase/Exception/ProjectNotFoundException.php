<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\Exception;

final class ProjectNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Projet introuvable.')
    {
        parent::__construct($message);
    }
}

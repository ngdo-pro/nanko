<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\Exception;

final class ProjectSlugAlreadyExistsException extends \RuntimeException
{
    public function __construct(string $message = 'Un projet avec ce slug existe déjà dans cette organisation.')
    {
        parent::__construct($message);
    }
}

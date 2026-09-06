<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\Exception;

final class DocumentSlugAlreadyExistsException extends \RuntimeException
{
    public function __construct(string $message = 'Un document avec ce slug existe déjà dans ce projet.')
    {
        parent::__construct($message);
    }
}

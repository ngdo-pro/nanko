<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\Exception;

final class OrganisationNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Organisation introuvable.')
    {
        parent::__construct($message);
    }
}

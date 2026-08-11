<?php

declare(strict_types=1);

namespace App\Repository;

final class ProjectNotFoundException extends \RuntimeException
{
    public function __construct(public readonly string $id)
    {
        parent::__construct(sprintf('No project with id "%s" exists.', $id));
    }
}

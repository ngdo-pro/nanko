<?php

declare(strict_types=1);

namespace App\Repository;

final class InvalidParentException extends \RuntimeException
{
    public function __construct(public readonly string $parentId, public readonly string $projectId)
    {
        parent::__construct(sprintf(
            'Element "%s" is not part of project "%s" and cannot be used as a parent here.',
            $parentId,
            $projectId,
        ));
    }
}

<?php

declare(strict_types=1);

namespace App\Repository;

final class RelationNotFoundException extends \RuntimeException
{
    public function __construct(public readonly string $id)
    {
        parent::__construct(sprintf('No relation with id "%s" exists.', $id));
    }
}

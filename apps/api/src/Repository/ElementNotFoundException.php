<?php

declare(strict_types=1);

namespace App\Repository;

final class ElementNotFoundException extends \RuntimeException
{
    public function __construct(public readonly string $id)
    {
        parent::__construct(sprintf('No element with id "%s" exists.', $id));
    }
}

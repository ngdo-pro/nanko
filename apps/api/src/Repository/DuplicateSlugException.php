<?php

declare(strict_types=1);

namespace App\Repository;

final class DuplicateSlugException extends \RuntimeException
{
    public function __construct(public readonly string $slug)
    {
        parent::__construct(sprintf('A project with slug "%s" already exists.', $slug));
    }
}

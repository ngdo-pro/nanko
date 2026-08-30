<?php

declare(strict_types=1);

namespace App\Core\UseCase\Org\CreateOrg;

final readonly class Command
{
    public function __construct(public string $name)
    {
    }
}

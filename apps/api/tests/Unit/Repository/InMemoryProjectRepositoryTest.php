<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Repository\ProjectRepositoryInterface;
use App\Tests\Support\InMemoryProjectRepository;
use App\Tests\Support\ProjectRepositoryTestCase;

final class InMemoryProjectRepositoryTest extends ProjectRepositoryTestCase
{
    protected function createRepository(): ProjectRepositoryInterface
    {
        return new InMemoryProjectRepository();
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Functional\Repository;

use App\Repository\DoctrineProjectRepository;
use App\Repository\ProjectRepositoryInterface;
use App\Tests\Support\ProjectRepositoryTestCase;
use Doctrine\DBAL\Connection;

final class DoctrineProjectRepositoryTest extends ProjectRepositoryTestCase
{
    protected function createRepository(): ProjectRepositoryInterface
    {
        self::bootKernel();

        $connection = static::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE project, milestone, element, element_version, relation, relation_version RESTART IDENTITY');

        return static::getContainer()->get(DoctrineProjectRepository::class);
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Functional\Repository;

use App\Repository\DoctrineMilestoneRepository;
use App\Repository\MilestoneRepositoryInterface;
use App\Tests\Support\MilestoneRepositoryTestCase;
use Doctrine\DBAL\Connection;

final class DoctrineMilestoneRepositoryTest extends MilestoneRepositoryTestCase
{
    private Connection $connection;

    protected function createRepository(): MilestoneRepositoryInterface
    {
        self::bootKernel();

        $this->connection = static::getContainer()->get(Connection::class);
        $this->connection->executeStatement('TRUNCATE project, milestone, element, element_version, relation, relation_version, position, annotation RESTART IDENTITY');

        return static::getContainer()->get(DoctrineMilestoneRepository::class);
    }

    protected function createProject(): string
    {
        /** @var array<string, mixed> $row */
        $row = $this->connection->fetchAssociative(
            "INSERT INTO project (name, slug) VALUES ('Test project', 'test-' || gen_random_uuid())
             RETURNING id",
        );

        self::assertIsString($row['id']);

        return $row['id'];
    }
}

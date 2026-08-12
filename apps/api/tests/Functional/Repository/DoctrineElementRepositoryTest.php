<?php

declare(strict_types=1);

namespace App\Tests\Functional\Repository;

use App\Repository\DoctrineElementRepository;
use App\Repository\ElementRepositoryInterface;
use App\Tests\Support\ElementRepositoryTestCase;
use Doctrine\DBAL\Connection;

final class DoctrineElementRepositoryTest extends ElementRepositoryTestCase
{
    private Connection $connection;

    protected function createRepository(): ElementRepositoryInterface
    {
        self::bootKernel();

        $this->connection = static::getContainer()->get(Connection::class);
        $this->connection->executeStatement('TRUNCATE project, milestone, element, element_version, relation, relation_version, position RESTART IDENTITY');

        return static::getContainer()->get(DoctrineElementRepository::class);
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

    protected function createMilestone(string $projectId): string
    {
        /** @var array<string, mixed> $row */
        $row = $this->connection->fetchAssociative(
            'INSERT INTO milestone (project_id, label, sort_order)
             SELECT :project_id, \'Test milestone\', COALESCE(MAX(sort_order) + 1, 0)
             FROM milestone WHERE project_id = :project_id
             RETURNING id',
            ['project_id' => $projectId],
        );

        self::assertIsString($row['id']);

        return $row['id'];
    }
}

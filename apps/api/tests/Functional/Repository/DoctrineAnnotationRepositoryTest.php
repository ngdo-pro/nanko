<?php

declare(strict_types=1);

namespace App\Tests\Functional\Repository;

use App\Repository\AnnotationRepositoryInterface;
use App\Repository\DoctrineAnnotationRepository;
use App\Tests\Support\AnnotationRepositoryTestCase;
use Doctrine\DBAL\Connection;

final class DoctrineAnnotationRepositoryTest extends AnnotationRepositoryTestCase
{
    private Connection $connection;

    protected function createRepository(): AnnotationRepositoryInterface
    {
        self::bootKernel();

        $this->connection = static::getContainer()->get(Connection::class);
        $this->connection->executeStatement('TRUNCATE project, milestone, element, element_version, relation, relation_version, position, annotation, annotation_link RESTART IDENTITY');

        return static::getContainer()->get(DoctrineAnnotationRepository::class);
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

    protected function createElement(string $projectId, string $milestoneId): string
    {
        /** @var array<string, mixed> $row */
        $row = $this->connection->fetchAssociative(
            "INSERT INTO element (project_id, kind, is_external, created_at_milestone_id)
             VALUES (:project_id, 'system', false, :milestone_id)
             RETURNING id",
            ['project_id' => $projectId, 'milestone_id' => $milestoneId],
        );

        self::assertIsString($row['id']);

        return $row['id'];
    }

    protected function createRelation(string $projectId, string $milestoneId, string $sourceId, string $targetId): string
    {
        /** @var array<string, mixed> $row */
        $row = $this->connection->fetchAssociative(
            "INSERT INTO relation (project_id, source_element_id, target_element_id, created_at_milestone_id)
             VALUES (:project_id, :source_id, :target_id, :milestone_id)
             RETURNING id",
            [
                'project_id' => $projectId,
                'source_id' => $sourceId,
                'target_id' => $targetId,
                'milestone_id' => $milestoneId,
            ],
        );

        self::assertIsString($row['id']);

        return $row['id'];
    }
}

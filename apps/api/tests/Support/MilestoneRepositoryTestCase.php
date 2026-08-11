<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\MilestoneRepositoryInterface;
use App\Repository\ProjectNotFoundException;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Shared behavioral contract for every MilestoneRepositoryInterface implementation.
 *
 * Each concrete implementation (InMemory, Doctrine, ...) must pass every test
 * here unmodified, so a fake used in fast unit tests can never silently drift
 * from the real adapter's behavior.
 */
abstract class MilestoneRepositoryTestCase extends KernelTestCase
{
    protected MilestoneRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createRepository();
    }

    abstract protected function createRepository(): MilestoneRepositoryInterface;

    /**
     * @return string id of a freshly created, persisted project
     */
    abstract protected function createProject(): string;

    #[Test]
    public function it returns an empty array when no milestone exists for a project(): void
    {
        // GIVEN a project with no milestone
        $projectId = $this->createProject();

        // WHEN listing its milestones
        $milestones = $this->repository->findAllByProject($projectId);

        // THEN the list is empty
        self::assertSame([], $milestones);
    }

    #[Test]
    public function it returns the created milestone with an id sort order zero and a timestamp(): void
    {
        // GIVEN a project
        $projectId = $this->createProject();

        // WHEN creating a milestone
        $milestone = $this->repository->create($projectId, 'Launch', '2026-03-01');

        // THEN the created milestone is returned with a generated id, sort_order zero and a timestamp
        self::assertSame($projectId, $milestone['project_id']);
        self::assertSame('Launch', $milestone['label']);
        self::assertSame('2026-03-01', $milestone['occurs_on']);
        self::assertSame(0, $milestone['sort_order']);
        self::assertIsString($milestone['id']);
        self::assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $milestone['id'],
        );
        self::assertArrayHasKey('created_at', $milestone);
    }

    #[Test]
    public function a created milestone appears in the list(): void
    {
        // GIVEN a milestone was created
        $projectId = $this->createProject();
        $this->repository->create($projectId, 'Launch', null);

        // WHEN listing milestones for the project
        $milestones = $this->repository->findAllByProject($projectId);

        // THEN the created milestone appears in the list
        self::assertCount(1, $milestones);
        self::assertSame('Launch', $milestones[0]['label']);
    }

    #[Test]
    public function successive milestones get increasing sort orders(): void
    {
        // GIVEN a project
        $projectId = $this->createProject();

        // WHEN creating three milestones in sequence
        $first = $this->repository->create($projectId, 'First', null);
        $second = $this->repository->create($projectId, 'Second', null);
        $third = $this->repository->create($projectId, 'Third', null);

        // THEN each gets the next sort_order, in creation order
        self::assertSame(0, $first['sort_order']);
        self::assertSame(1, $second['sort_order']);
        self::assertSame(2, $third['sort_order']);

        // AND the list is ordered by sort_order
        $milestones = $this->repository->findAllByProject($projectId);
        self::assertSame(['First', 'Second', 'Third'], array_column($milestones, 'label'));
    }

    #[Test]
    public function creating a milestone without an occurs on date stores null(): void
    {
        // GIVEN a project
        $projectId = $this->createProject();

        // WHEN creating a milestone without an occurs_on date
        $milestone = $this->repository->create($projectId, 'Someday', null);

        // THEN occurs_on is null
        self::assertNull($milestone['occurs_on']);
    }

    #[Test]
    public function creating a milestone for an unknown project throws(): void
    {
        // GIVEN no project with this id exists

        // WHEN creating a milestone for an unknown project
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->create('00000000-0000-0000-0000-000000000000', 'Launch', null);
    }
}

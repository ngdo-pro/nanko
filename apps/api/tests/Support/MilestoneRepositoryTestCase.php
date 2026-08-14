<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\InvalidMilestoneOrderException;
use App\Repository\MilestoneNotFoundException;
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

    #[Test]
    public function it updates the label and occurs on date(): void
    {
        // GIVEN a milestone
        $projectId = $this->createProject();
        $milestone = $this->repository->create($projectId, 'Launch', '2026-03-01');
        self::assertIsString($milestone['id']);

        // WHEN updating its label and occurs_on
        $updated = $this->repository->update($milestone['id'], 'Launch v2', '2026-04-15');

        // THEN the new values are applied
        self::assertSame('Launch v2', $updated['label']);
        self::assertSame('2026-04-15', $updated['occurs_on']);
        self::assertSame($milestone['id'], $updated['id']);
    }

    #[Test]
    public function updating a milestone does not change its sort order(): void
    {
        // GIVEN three milestones
        $projectId = $this->createProject();
        $this->repository->create($projectId, 'First', null);
        $second = $this->repository->create($projectId, 'Second', null);
        $this->repository->create($projectId, 'Third', null);
        self::assertIsString($second['id']);

        // WHEN updating the middle one
        $updated = $this->repository->update($second['id'], 'Second, renamed', null);

        // THEN its sort_order is unchanged
        self::assertSame(1, $updated['sort_order']);
    }

    #[Test]
    public function updating a milestone can clear its occurs on date(): void
    {
        // GIVEN a milestone with a date
        $projectId = $this->createProject();
        $milestone = $this->repository->create($projectId, 'Launch', '2026-03-01');
        self::assertIsString($milestone['id']);

        // WHEN updating it without an occurs_on
        $updated = $this->repository->update($milestone['id'], 'Launch', null);

        // THEN the date is cleared
        self::assertNull($updated['occurs_on']);
    }

    #[Test]
    public function updating an unknown milestone throws(): void
    {
        // GIVEN no milestone with this id exists

        // WHEN updating an unknown milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->update('00000000-0000-0000-0000-000000000000', 'Launch', null);
    }

    #[Test]
    public function reorder reassigns sort order to match the given order(): void
    {
        // GIVEN three milestones in creation order
        $projectId = $this->createProject();
        $first = $this->repository->create($projectId, 'First', null);
        $second = $this->repository->create($projectId, 'Second', null);
        $third = $this->repository->create($projectId, 'Third', null);
        self::assertIsString($first['id']);
        self::assertIsString($second['id']);
        self::assertIsString($third['id']);

        // WHEN reordering to the fully reversed order (not just an adjacent swap,
        // which could pass even on a broken shifting implementation)
        $reordered = $this->repository->reorder($projectId, [$third['id'], $second['id'], $first['id']]);

        // THEN sort_order now matches the given order exactly
        self::assertSame(['Third', 'Second', 'First'], array_column($reordered, 'label'));
        self::assertSame([0, 1, 2], array_column($reordered, 'sort_order'));

        // AND the list is persisted in that new order
        $listed = $this->repository->findAllByProject($projectId);
        self::assertSame(['Third', 'Second', 'First'], array_column($listed, 'label'));
    }

    #[Test]
    public function reorder throws when the given ids do not exactly match the projects milestones(): void
    {
        // GIVEN two milestones
        $projectId = $this->createProject();
        $first = $this->repository->create($projectId, 'First', null);
        $this->repository->create($projectId, 'Second', null);
        self::assertIsString($first['id']);

        // WHEN reordering with a list missing one of them
        // THEN an InvalidMilestoneOrderException is thrown
        $this->expectException(InvalidMilestoneOrderException::class);
        $this->repository->reorder($projectId, [$first['id']]);
    }

    #[Test]
    public function reorder throws when the given ids include one that does not belong to the project(): void
    {
        // GIVEN a milestone in one project and another in a different project
        $projectId = $this->createProject();
        $first = $this->repository->create($projectId, 'First', null);
        $otherProjectId = $this->createProject();
        $foreign = $this->repository->create($otherProjectId, 'Foreign', null);
        self::assertIsString($first['id']);
        self::assertIsString($foreign['id']);

        // WHEN reordering with an id from the other project mixed in
        // THEN an InvalidMilestoneOrderException is thrown
        $this->expectException(InvalidMilestoneOrderException::class);
        $this->repository->reorder($projectId, [$foreign['id'], $first['id']]);
    }

    #[Test]
    public function reorder for an unknown project throws(): void
    {
        // GIVEN no project with this id exists

        // WHEN reordering for an unknown project
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->reorder('00000000-0000-0000-0000-000000000000', ['00000000-0000-0000-0000-000000000001']);
    }
}

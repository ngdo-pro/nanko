<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\PositionRepositoryInterface;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Shared behavioral contract for every PositionRepositoryInterface implementation.
 *
 * Each concrete implementation (InMemory, Doctrine, ...) must pass every test
 * here unmodified, so a fake used in fast unit tests can never silently drift
 * from the real adapter's behavior.
 */
abstract class PositionRepositoryTestCase extends KernelTestCase
{
    protected PositionRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createRepository();
    }

    abstract protected function createRepository(): PositionRepositoryInterface;

    /**
     * @return string id of a freshly created, persisted project
     */
    abstract protected function createProject(): string;

    /**
     * @return string id of a freshly created, persisted milestone belonging to $projectId
     */
    abstract protected function createMilestone(string $projectId): string;

    /**
     * @return string id of a freshly created, persisted element belonging to $projectId
     */
    abstract protected function createElement(string $projectId, string $milestoneId): string;

    #[Test]
    public function it upserts a default position for an element(): void
    {
        // GIVEN a project, a milestone, and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN upserting a default (non-milestone-specific) position
        $position = $this->repository->upsert($elementId, null, 100.0, 200.0);

        // THEN the position carries the given coordinates and no milestone
        self::assertSame($elementId, $position['element_id']);
        self::assertNull($position['milestone_id']);
        self::assertSame(100.0, $position['x']);
        self::assertSame(200.0, $position['y']);
    }

    #[Test]
    public function it upserts a milestone specific position for an element(): void
    {
        // GIVEN a project, a milestone, and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN upserting a position for that specific milestone
        $position = $this->repository->upsert($elementId, $milestoneId, 10.0, 20.0);

        // THEN the position carries the given milestone and coordinates
        self::assertSame($milestoneId, $position['milestone_id']);
        self::assertSame(10.0, $position['x']);
        self::assertSame(20.0, $position['y']);
    }

    #[Test]
    public function upserting a default position twice updates it in place(): void
    {
        // GIVEN an element with an existing default position
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $this->repository->upsert($elementId, null, 1.0, 1.0);

        // WHEN upserting a default position again for the same element
        $this->repository->upsert($elementId, null, 5.0, 6.0);

        // THEN exactly one default position row survives, with the updated coordinates
        $positions = array_values(array_filter(
            $this->repository->findAllByProject($projectId),
            static fn (array $position): bool => $position['milestone_id'] === null,
        ));
        self::assertCount(1, $positions);
        self::assertSame(5.0, $positions[0]['x']);
        self::assertSame(6.0, $positions[0]['y']);
    }

    #[Test]
    public function upserting a milestone specific position twice updates it in place without affecting the default(): void
    {
        // GIVEN an element with both a default and a milestone-specific position
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $this->repository->upsert($elementId, null, 1.0, 1.0);
        $this->repository->upsert($elementId, $milestoneId, 2.0, 2.0);

        // WHEN upserting the milestone-specific position again
        $this->repository->upsert($elementId, $milestoneId, 9.0, 9.0);

        // THEN the milestone-specific row is updated in place and the default is untouched
        $positions = $this->repository->findAllByProject($projectId);
        self::assertCount(2, $positions);

        $byMilestone = [];
        foreach ($positions as $position) {
            $key = $position['milestone_id'] ?? '__default__';
            $byMilestone[$key] = $position;
        }

        self::assertSame(9.0, $byMilestone[$milestoneId]['x']);
        self::assertSame(1.0, $byMilestone['__default__']['x']);
    }

    #[Test]
    public function a created position appears in the project list(): void
    {
        // GIVEN a position was upserted
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $this->repository->upsert($elementId, null, 3.0, 4.0);

        // WHEN listing positions for the project
        $positions = $this->repository->findAllByProject($projectId);

        // THEN the upserted position appears in the list
        self::assertCount(1, $positions);
        self::assertSame($elementId, $positions[0]['element_id']);
    }

    #[Test]
    public function upserting a position for an unknown element throws(): void
    {
        // GIVEN no element exists
        // WHEN upserting a position for an unknown element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->upsert('00000000-0000-0000-0000-000000000000', null, 0.0, 0.0);
    }

    #[Test]
    public function upserting a position with an unknown milestone throws(): void
    {
        // GIVEN a project and an element, but no matching milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN upserting a position with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->upsert($elementId, '00000000-0000-0000-0000-000000000000', 0.0, 0.0);
    }
}

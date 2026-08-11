<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\ElementRepositoryInterface;
use App\Repository\InvalidParentException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Shared behavioral contract for every ElementRepositoryInterface implementation.
 *
 * Each concrete implementation (InMemory, Doctrine, ...) must pass every test
 * here unmodified, so a fake used in fast unit tests can never silently drift
 * from the real adapter's behavior.
 */
abstract class ElementRepositoryTestCase extends KernelTestCase
{
    protected ElementRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createRepository();
    }

    abstract protected function createRepository(): ElementRepositoryInterface;

    /**
     * @return string id of a freshly created, persisted project
     */
    abstract protected function createProject(): string;

    /**
     * @return string id of a freshly created, persisted milestone belonging to $projectId
     */
    abstract protected function createMilestone(string $projectId): string;

    #[Test]
    public function it creates a top level element with the given attributes(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN creating a top-level element
        $element = $this->repository->create(
            $projectId,
            $milestoneId,
            'system',
            null,
            'Booking',
            'Handles bookings',
            'Symfony',
            false,
        );

        // THEN the created element carries the given attributes and a generated id
        self::assertSame($projectId, $element['project_id']);
        self::assertSame($milestoneId, $element['milestone_id']);
        self::assertNull($element['parent_id']);
        self::assertSame('system', $element['kind']);
        self::assertSame('Booking', $element['name']);
        self::assertSame('Handles bookings', $element['description']);
        self::assertSame('Symfony', $element['technology']);
        self::assertFalse($element['is_external']);
        self::assertIsString($element['id']);
        self::assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $element['id'],
        );
    }

    #[Test]
    public function it creates a child element referencing its parent(): void
    {
        // GIVEN a top-level element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $parent = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($parent['id']);

        // WHEN creating a child element under it
        $child = $this->repository->create(
            $projectId,
            $milestoneId,
            'container',
            $parent['id'],
            'API',
            null,
            'Node.js',
            false,
        );

        // THEN the child references its parent
        self::assertSame($parent['id'], $child['parent_id']);
        self::assertSame('container', $child['kind']);
    }

    #[Test]
    public function a created element appears in the project list(): void
    {
        // GIVEN an element was created
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);

        // WHEN listing elements for the project
        $elements = $this->repository->findAllByProject($projectId);

        // THEN the created element appears in the list
        self::assertCount(1, $elements);
        self::assertSame('Booking', $elements[0]['name']);
    }

    #[Test]
    public function elements are listed in creation order(): void
    {
        // GIVEN three elements created in sequence
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'First', null, null, false);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'Second', null, null, false);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'Third', null, null, false);

        // WHEN listing elements for the project
        $elements = $this->repository->findAllByProject($projectId);

        // THEN they come back in creation order
        self::assertSame(['First', 'Second', 'Third'], array_column($elements, 'name'));
    }

    #[Test]
    public function creating an element for an unknown project throws(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN creating an element for an unknown project
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->create(
            '00000000-0000-0000-0000-000000000000',
            $milestoneId,
            'system',
            null,
            'Booking',
            null,
            null,
            false,
        );
    }

    #[Test]
    public function creating an element with an unknown milestone throws(): void
    {
        // GIVEN a project with no matching milestone
        $projectId = $this->createProject();

        // WHEN creating an element with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->create(
            $projectId,
            '00000000-0000-0000-0000-000000000000',
            'system',
            null,
            'Booking',
            null,
            null,
            false,
        );
    }

    #[Test]
    public function creating an element with a milestone from a different project throws(): void
    {
        // GIVEN a milestone that belongs to a different project
        $projectId = $this->createProject();
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);

        // WHEN creating an element for $projectId using the other project's milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->create($projectId, $otherMilestoneId, 'system', null, 'Booking', null, null, false);
    }

    #[Test]
    public function creating an element with an unknown parent throws(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN creating an element with an unknown parent id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create(
            $projectId,
            $milestoneId,
            'container',
            '00000000-0000-0000-0000-000000000000',
            'API',
            null,
            null,
            false,
        );
    }

    #[Test]
    public function creating an element whose parent belongs to a different project throws(): void
    {
        // GIVEN a parent element that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);
        $foreignParent = $this->repository->create(
            $otherProjectId,
            $otherMilestoneId,
            'system',
            null,
            'Payment',
            null,
            null,
            false,
        );
        self::assertIsString($foreignParent['id']);

        // WHEN creating an element under that foreign parent
        // THEN an InvalidParentException is thrown
        $this->expectException(InvalidParentException::class);
        $this->repository->create(
            $projectId,
            $milestoneId,
            'container',
            $foreignParent['id'],
            'API',
            null,
            null,
            false,
        );
    }
}

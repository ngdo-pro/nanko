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

    #[Test]
    public function a created element single version appears in findAllVersionsByProject(): void
    {
        // GIVEN an element was created
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', 'desc', 'Symfony', false);
        self::assertIsString($element['id']);

        // WHEN listing raw version rows for the project
        $rows = $this->repository->findAllVersionsByProject($projectId);

        // THEN the element's single version appears, carrying its creation and attribute data
        self::assertCount(1, $rows);
        self::assertSame($element['id'], $rows[0]['id']);
        self::assertSame($milestoneId, $rows[0]['created_at_milestone_id']);
        self::assertNull($rows[0]['deleted_at_milestone_id']);
        self::assertSame($milestoneId, $rows[0]['version_milestone_id']);
        self::assertSame('Booking', $rows[0]['name']);
        self::assertSame('desc', $rows[0]['description']);
        self::assertSame('Symfony', $rows[0]['technology']);
    }

    #[Test]
    public function findAllVersionsByProject rows are ordered by element creation order(): void
    {
        // GIVEN three elements created in sequence
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'First', null, null, false);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'Second', null, null, false);
        $this->repository->create($projectId, $milestoneId, 'system', null, 'Third', null, null, false);

        // WHEN listing raw version rows for the project
        $rows = $this->repository->findAllVersionsByProject($projectId);

        // THEN they come back in creation order
        self::assertSame(['First', 'Second', 'Third'], array_column($rows, 'name'));
    }

    #[Test]
    public function it applies the given name description and technology when updating an element(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', 'old desc', 'old tech', false);
        self::assertIsString($element['id']);

        // WHEN updating it at the same milestone
        $updated = $this->repository->update($element['id'], $milestoneId, 'Payments', 'new desc', 'new tech');

        // THEN the returned element carries the new attributes
        self::assertSame($element['id'], $updated['id']);
        self::assertSame($milestoneId, $updated['milestone_id']);
        self::assertSame('Payments', $updated['name']);
        self::assertSame('new desc', $updated['description']);
        self::assertSame('new tech', $updated['technology']);
    }

    #[Test]
    public function updating an element at the same milestone twice keeps a single version for that milestone(): void
    {
        // GIVEN an element updated once already at a milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);
        $this->repository->update($element['id'], $milestoneId, 'First rename', null, null);

        // WHEN updating it again at the same milestone
        $this->repository->update($element['id'], $milestoneId, 'Second rename', null, null);

        // THEN only one version row exists for that milestone, carrying the latest name
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $element['id'],
        ));
        self::assertCount(1, $rows);
        self::assertSame('Second rename', $rows[0]['name']);
    }

    #[Test]
    public function updating an element at a new milestone adds a version without touching the previous one(): void
    {
        // GIVEN an element created at one milestone
        $projectId = $this->createProject();
        $firstMilestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $firstMilestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);
        $secondMilestoneId = $this->createMilestone($projectId);

        // WHEN updating it at a later milestone
        $this->repository->update($element['id'], $secondMilestoneId, 'Booking v2', null, null);

        // THEN both versions are preserved, one per milestone
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $element['id'],
        ));
        self::assertCount(2, $rows);
        $names = array_column($rows, 'name', 'version_milestone_id');
        self::assertSame('Booking', $names[$firstMilestoneId]);
        self::assertSame('Booking v2', $names[$secondMilestoneId]);
    }

    #[Test]
    public function updating an unknown element throws(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN updating an unknown element
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->update('00000000-0000-0000-0000-000000000000', $milestoneId, 'Booking', null, null);
    }

    #[Test]
    public function updating an element with an unknown milestone throws(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);

        // WHEN updating it with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->update($element['id'], '00000000-0000-0000-0000-000000000000', 'Booking', null, null);
    }

    #[Test]
    public function updating an element with a milestone from a different project throws(): void
    {
        // GIVEN an element and a milestone that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);

        // WHEN updating the element using the other project's milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->update($element['id'], $otherMilestoneId, 'Booking', null, null);
    }

    #[Test]
    public function soft deleting an element sets its deleted at milestone(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);
        $deleteMilestoneId = $this->createMilestone($projectId);

        // WHEN soft deleting it at a later milestone
        $deleted = $this->repository->softDelete($element['id'], $deleteMilestoneId);

        // THEN the element carries the deletion milestone, not a physical removal
        self::assertSame($deleteMilestoneId, $deleted['deleted_at_milestone_id']);
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $element['id'],
        ));
        self::assertNotEmpty($rows);
        self::assertSame($deleteMilestoneId, $rows[0]['deleted_at_milestone_id']);
    }

    #[Test]
    public function soft deleting an unknown element throws(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN soft deleting an unknown element
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->softDelete('00000000-0000-0000-0000-000000000000', $milestoneId);
    }

    #[Test]
    public function soft deleting an element with an unknown milestone throws(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);

        // WHEN soft deleting it with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->softDelete($element['id'], '00000000-0000-0000-0000-000000000000');
    }

    #[Test]
    public function soft deleting an element with a milestone from a different project throws(): void
    {
        // GIVEN an element and a milestone that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);
        self::assertIsString($element['id']);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);

        // WHEN soft deleting the element using the other project's milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->softDelete($element['id'], $otherMilestoneId);
    }

    #[Test]
    public function it creates an element with the given archetype(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN creating a container tagged as a database
        $element = $this->repository->create($projectId, $milestoneId, 'container', null, 'Primary DB', null, 'Postgres', false, 'database');

        // THEN the created element carries the given archetype
        self::assertSame('database', $element['archetype']);
    }

    #[Test]
    public function it creates an element with a null archetype by default(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN creating an element without specifying an archetype
        $element = $this->repository->create($projectId, $milestoneId, 'system', null, 'Booking', null, null, false);

        // THEN the created element has no archetype
        self::assertNull($element['archetype']);
    }

    #[Test]
    public function updating an element changes its archetype(): void
    {
        // GIVEN an element created without an archetype
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'container', null, 'Cache', null, null, false);
        self::assertIsString($element['id']);

        // WHEN updating it with an archetype
        $updated = $this->repository->update($element['id'], $milestoneId, 'Cache', null, 'Redis', 'database');

        // THEN the archetype is applied
        self::assertSame('database', $updated['archetype']);
    }

    #[Test]
    public function updating an element without an archetype clears it(): void
    {
        // GIVEN an element created with an archetype
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $milestoneId, 'container', null, 'Queue', null, null, false, 'queue');
        self::assertIsString($element['id']);

        // WHEN updating it without specifying an archetype
        $updated = $this->repository->update($element['id'], $milestoneId, 'Queue', null, null);

        // THEN the archetype is cleared, not left as it was
        self::assertNull($updated['archetype']);
    }

    #[Test]
    public function archetype is not versioned it changes for every milestone at once(): void
    {
        // GIVEN an element created at one milestone, later given an archetype at a second milestone
        $projectId = $this->createProject();
        $firstMilestoneId = $this->createMilestone($projectId);
        $element = $this->repository->create($projectId, $firstMilestoneId, 'container', null, 'Cache', null, null, false);
        self::assertIsString($element['id']);
        $secondMilestoneId = $this->createMilestone($projectId);
        $this->repository->update($element['id'], $secondMilestoneId, 'Cache', null, null, 'database');

        // WHEN listing versions for the project
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $element['id'],
        ));

        // THEN every version row reflects the same, single archetype (unlike name/description/technology, it is not per-milestone)
        self::assertCount(2, $rows);
        self::assertSame('database', $rows[0]['archetype']);
        self::assertSame('database', $rows[1]['archetype']);
    }
}

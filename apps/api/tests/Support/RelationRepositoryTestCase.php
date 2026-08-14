<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\InvalidRelationElementException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationNotFoundException;
use App\Repository\RelationRepositoryInterface;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Shared behavioral contract for every RelationRepositoryInterface implementation.
 *
 * Each concrete implementation (InMemory, Doctrine, ...) must pass every test
 * here unmodified, so a fake used in fast unit tests can never silently drift
 * from the real adapter's behavior.
 */
abstract class RelationRepositoryTestCase extends KernelTestCase
{
    protected RelationRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createRepository();
    }

    abstract protected function createRepository(): RelationRepositoryInterface;

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
    public function it creates a relation between two elements with the given attributes(): void
    {
        // GIVEN a project, a milestone, and two elements
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);

        // WHEN creating a relation between them
        $relation = $this->repository->create(
            $projectId,
            $milestoneId,
            $sourceId,
            $targetId,
            'reads/writes',
            'HTTP',
        );

        // THEN the created relation carries the given attributes and a generated id
        self::assertSame($projectId, $relation['project_id']);
        self::assertSame($milestoneId, $relation['milestone_id']);
        self::assertSame($sourceId, $relation['source_element_id']);
        self::assertSame($targetId, $relation['target_element_id']);
        self::assertSame('declared', $relation['status']);
        self::assertSame('reads/writes', $relation['label']);
        self::assertSame('HTTP', $relation['technology']);
        self::assertIsString($relation['id']);
        self::assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $relation['id'],
        );
    }

    #[Test]
    public function a created relation appears in the project list(): void
    {
        // GIVEN a relation was created
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);

        // WHEN listing relations for the project
        $relations = $this->repository->findAllByProject($projectId);

        // THEN the created relation appears in the list
        self::assertCount(1, $relations);
        self::assertSame($sourceId, $relations[0]['source_element_id']);
        self::assertSame($targetId, $relations[0]['target_element_id']);
    }

    #[Test]
    public function relations are listed in creation order(): void
    {
        // GIVEN three relations created in sequence
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $a = $this->createElement($projectId, $milestoneId);
        $b = $this->createElement($projectId, $milestoneId);
        $c = $this->createElement($projectId, $milestoneId);
        $this->repository->create($projectId, $milestoneId, $a, $b, 'first', null);
        $this->repository->create($projectId, $milestoneId, $b, $c, 'second', null);
        $this->repository->create($projectId, $milestoneId, $a, $c, 'third', null);

        // WHEN listing relations for the project
        $relations = $this->repository->findAllByProject($projectId);

        // THEN they come back in creation order
        self::assertSame(['first', 'second', 'third'], array_column($relations, 'label'));
    }

    #[Test]
    public function creating a relation for an unknown project throws(): void
    {
        // GIVEN a milestone and elements that belong to some real project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);

        // WHEN creating a relation for an unknown project
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->create(
            '00000000-0000-0000-0000-000000000000',
            $milestoneId,
            $sourceId,
            $targetId,
            null,
            null,
        );
    }

    #[Test]
    public function creating a relation with an unknown milestone throws(): void
    {
        // GIVEN a project with no matching milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);

        // WHEN creating a relation with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->create(
            $projectId,
            '00000000-0000-0000-0000-000000000000',
            $sourceId,
            $targetId,
            null,
            null,
        );
    }

    #[Test]
    public function creating a relation with a milestone from a different project throws(): void
    {
        // GIVEN a milestone that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);

        // WHEN creating a relation for $projectId using the other project's milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->create($projectId, $otherMilestoneId, $sourceId, $targetId, null, null);
    }

    #[Test]
    public function creating a relation with an unknown source element throws(): void
    {
        // GIVEN a project, a milestone, and a real target element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $targetId = $this->createElement($projectId, $milestoneId);

        // WHEN creating a relation with an unknown source element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create(
            $projectId,
            $milestoneId,
            '00000000-0000-0000-0000-000000000000',
            $targetId,
            null,
            null,
        );
    }

    #[Test]
    public function creating a relation with an unknown target element throws(): void
    {
        // GIVEN a project, a milestone, and a real source element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);

        // WHEN creating a relation with an unknown target element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create(
            $projectId,
            $milestoneId,
            $sourceId,
            '00000000-0000-0000-0000-000000000000',
            null,
            null,
        );
    }

    #[Test]
    public function creating a relation whose source element belongs to a different project throws(): void
    {
        // GIVEN a source element that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);
        $foreignSourceId = $this->createElement($otherProjectId, $otherMilestoneId);

        // WHEN creating a relation using that foreign element as the source
        // THEN an InvalidRelationElementException is thrown
        $this->expectException(InvalidRelationElementException::class);
        $this->repository->create($projectId, $milestoneId, $foreignSourceId, $targetId, null, null);
    }

    #[Test]
    public function creating a relation whose target element belongs to a different project throws(): void
    {
        // GIVEN a target element that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);
        $foreignTargetId = $this->createElement($otherProjectId, $otherMilestoneId);

        // WHEN creating a relation using that foreign element as the target
        // THEN an InvalidRelationElementException is thrown
        $this->expectException(InvalidRelationElementException::class);
        $this->repository->create($projectId, $milestoneId, $sourceId, $foreignTargetId, null, null);
    }

    #[Test]
    public function a created relation single version appears in findAllVersionsByProject(): void
    {
        // GIVEN a relation was created
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, 'reads/writes', 'HTTP');
        self::assertIsString($relation['id']);

        // WHEN listing raw version rows for the project
        $rows = $this->repository->findAllVersionsByProject($projectId);

        // THEN the relation's single version appears, carrying its creation and attribute data
        self::assertCount(1, $rows);
        self::assertSame($relation['id'], $rows[0]['id']);
        self::assertSame($sourceId, $rows[0]['source_element_id']);
        self::assertSame($targetId, $rows[0]['target_element_id']);
        self::assertSame($milestoneId, $rows[0]['created_at_milestone_id']);
        self::assertNull($rows[0]['deleted_at_milestone_id']);
        self::assertSame($milestoneId, $rows[0]['version_milestone_id']);
        self::assertSame('reads/writes', $rows[0]['label']);
        self::assertSame('HTTP', $rows[0]['technology']);
    }

    #[Test]
    public function findAllVersionsByProject rows are ordered by relation creation order(): void
    {
        // GIVEN three relations created in sequence
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $a = $this->createElement($projectId, $milestoneId);
        $b = $this->createElement($projectId, $milestoneId);
        $c = $this->createElement($projectId, $milestoneId);
        $this->repository->create($projectId, $milestoneId, $a, $b, 'first', null);
        $this->repository->create($projectId, $milestoneId, $b, $c, 'second', null);
        $this->repository->create($projectId, $milestoneId, $a, $c, 'third', null);

        // WHEN listing raw version rows for the project
        $rows = $this->repository->findAllVersionsByProject($projectId);

        // THEN they come back in creation order
        self::assertSame(['first', 'second', 'third'], array_column($rows, 'label'));
    }

    #[Test]
    public function it applies the given label and technology when updating a relation(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, 'old label', 'old tech');
        self::assertIsString($relation['id']);

        // WHEN updating it at the same milestone
        $updated = $this->repository->update($relation['id'], $milestoneId, 'new label', 'new tech');

        // THEN the returned relation carries the new attributes
        self::assertSame($relation['id'], $updated['id']);
        self::assertSame($milestoneId, $updated['milestone_id']);
        self::assertSame('new label', $updated['label']);
        self::assertSame('new tech', $updated['technology']);
    }

    #[Test]
    public function updating a relation at the same milestone twice keeps a single version for that milestone(): void
    {
        // GIVEN a relation updated once already at a milestone
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, 'first', null);
        self::assertIsString($relation['id']);
        $this->repository->update($relation['id'], $milestoneId, 'second', null);

        // WHEN updating it again at the same milestone
        $this->repository->update($relation['id'], $milestoneId, 'third', null);

        // THEN only one version row exists for that milestone, carrying the latest label
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $relation['id'],
        ));
        self::assertCount(1, $rows);
        self::assertSame('third', $rows[0]['label']);
    }

    #[Test]
    public function updating a relation at a new milestone adds a version without touching the previous one(): void
    {
        // GIVEN a relation created at one milestone
        $projectId = $this->createProject();
        $firstMilestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $firstMilestoneId);
        $targetId = $this->createElement($projectId, $firstMilestoneId);
        $relation = $this->repository->create($projectId, $firstMilestoneId, $sourceId, $targetId, 'v1', null);
        self::assertIsString($relation['id']);
        $secondMilestoneId = $this->createMilestone($projectId);

        // WHEN updating it at a later milestone
        $this->repository->update($relation['id'], $secondMilestoneId, 'v2', null);

        // THEN both versions are preserved, one per milestone
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $relation['id'],
        ));
        self::assertCount(2, $rows);
        $labels = array_column($rows, 'label', 'version_milestone_id');
        self::assertSame('v1', $labels[$firstMilestoneId]);
        self::assertSame('v2', $labels[$secondMilestoneId]);
    }

    #[Test]
    public function updating an unknown relation throws(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN updating an unknown relation
        // THEN a RelationNotFoundException is thrown
        $this->expectException(RelationNotFoundException::class);
        $this->repository->update('00000000-0000-0000-0000-000000000000', $milestoneId, 'label', null);
    }

    #[Test]
    public function updating a relation with an unknown milestone throws(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);
        self::assertIsString($relation['id']);

        // WHEN updating it with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->update($relation['id'], '00000000-0000-0000-0000-000000000000', 'label', null);
    }

    #[Test]
    public function updating a relation with a milestone from a different project throws(): void
    {
        // GIVEN a relation and a milestone that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);
        self::assertIsString($relation['id']);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);

        // WHEN updating the relation using the other project's milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->update($relation['id'], $otherMilestoneId, 'label', null);
    }

    #[Test]
    public function soft deleting a relation sets its deleted at milestone(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);
        self::assertIsString($relation['id']);
        $deleteMilestoneId = $this->createMilestone($projectId);

        // WHEN soft deleting it at a later milestone
        $deleted = $this->repository->softDelete($relation['id'], $deleteMilestoneId);

        // THEN the relation carries the deletion milestone, not a physical removal
        self::assertSame($deleteMilestoneId, $deleted['deleted_at_milestone_id']);
        $rows = array_values(array_filter(
            $this->repository->findAllVersionsByProject($projectId),
            static fn (array $row): bool => $row['id'] === $relation['id'],
        ));
        self::assertNotEmpty($rows);
        self::assertSame($deleteMilestoneId, $rows[0]['deleted_at_milestone_id']);
    }

    #[Test]
    public function soft deleting an unknown relation throws(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);

        // WHEN soft deleting an unknown relation
        // THEN a RelationNotFoundException is thrown
        $this->expectException(RelationNotFoundException::class);
        $this->repository->softDelete('00000000-0000-0000-0000-000000000000', $milestoneId);
    }

    #[Test]
    public function soft deleting a relation with an unknown milestone throws(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);
        self::assertIsString($relation['id']);

        // WHEN soft deleting it with an unknown milestone id
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->softDelete($relation['id'], '00000000-0000-0000-0000-000000000000');
    }

    #[Test]
    public function soft deleting a relation with a milestone from a different project throws(): void
    {
        // GIVEN a relation and a milestone that belongs to a different project
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relation = $this->repository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);
        self::assertIsString($relation['id']);
        $otherProjectId = $this->createProject();
        $otherMilestoneId = $this->createMilestone($otherProjectId);

        // WHEN soft deleting the relation using the other project's milestone
        // THEN a MilestoneNotFoundException is thrown
        $this->expectException(MilestoneNotFoundException::class);
        $this->repository->softDelete($relation['id'], $otherMilestoneId);
    }
}

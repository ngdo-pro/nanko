<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ElementNotFoundException;
use App\Repository\InvalidRelationElementException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
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
}

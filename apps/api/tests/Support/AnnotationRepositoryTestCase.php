<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\AnnotationNotFoundException;
use App\Repository\AnnotationRepositoryInterface;
use App\Repository\ElementNotFoundException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationNotFoundException;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Shared behavioral contract for every AnnotationRepositoryInterface implementation.
 *
 * Each concrete implementation (InMemory, Doctrine, ...) must pass every test
 * here unmodified, so a fake used in fast unit tests can never silently drift
 * from the real adapter's behavior.
 */
abstract class AnnotationRepositoryTestCase extends KernelTestCase
{
    protected AnnotationRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createRepository();
    }

    abstract protected function createRepository(): AnnotationRepositoryInterface;

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

    /**
     * @return string id of a freshly created, persisted relation belonging to $projectId
     */
    abstract protected function createRelation(string $projectId, string $milestoneId, string $sourceId, string $targetId): string;

    #[Test]
    public function it creates an annotation at the given position with no link(): void
    {
        // GIVEN a project
        $projectId = $this->createProject();

        // WHEN creating an annotation with just a position — no element/relation link
        $annotation = $this->repository->create($projectId, null, null, null, 120.0, 80.0, 'Nicolas', 'Needs a data owner');

        // THEN the created annotation carries the given position and attributes, with no link
        self::assertSame($projectId, $annotation['project_id']);
        self::assertNull($annotation['element_id']);
        self::assertNull($annotation['relation_id']);
        self::assertSame(120.0, $annotation['x']);
        self::assertSame(80.0, $annotation['y']);
        self::assertSame('Nicolas', $annotation['author_name']);
        self::assertSame('Needs a data owner', $annotation['body']);
        self::assertIsString($annotation['id']);
    }

    #[Test]
    public function it creates an annotation linked to an element(): void
    {
        // GIVEN a project and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN creating an annotation linked to that element
        $annotation = $this->repository->create($projectId, $elementId, null, null, 0.0, 0.0, 'Nicolas', 'note');

        // THEN the created annotation carries the element link, no relation link
        self::assertSame($elementId, $annotation['element_id']);
        self::assertNull($annotation['relation_id']);
    }

    #[Test]
    public function it creates an annotation linked to a relation(): void
    {
        // GIVEN a project and a relation
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);

        // WHEN creating an annotation linked to that relation
        $annotation = $this->repository->create($projectId, null, $relationId, null, 0.0, 0.0, 'Nicolas', 'note');

        // THEN the created annotation carries the relation link, no element link
        self::assertSame($relationId, $annotation['relation_id']);
        self::assertNull($annotation['element_id']);
    }

    #[Test]
    public function a created annotation appears in the project scope list(): void
    {
        // GIVEN an annotation created with no scope element (the C1 root)
        $projectId = $this->createProject();
        $this->repository->create($projectId, null, null, null, 10.0, 20.0, 'Nicolas', 'note');

        // WHEN listing annotations scoped to the root (null scope)
        $annotations = $this->repository->findAllByProjectScope($projectId, null);

        // THEN the created annotation appears in the list
        self::assertCount(1, $annotations);
        self::assertSame(10.0, $annotations[0]['x']);
    }

    #[Test]
    public function an annotation scoped to an element does not appear in the root scope list(): void
    {
        // GIVEN an annotation explicitly scoped to a diagram (a container drilled into)
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $scopeElementId = $this->createElement($projectId, $milestoneId);
        $this->repository->create($projectId, null, null, $scopeElementId, 0.0, 0.0, 'Nicolas', 'note scoped to a diagram');

        // WHEN listing annotations scoped to the root (null scope)
        $annotations = $this->repository->findAllByProjectScope($projectId, null);

        // THEN the scoped annotation is not returned — it only belongs to its own diagram
        self::assertCount(0, $annotations);
    }

    #[Test]
    public function an annotation scoped to an element appears when listing that same scope(): void
    {
        // GIVEN an annotation explicitly scoped to a diagram
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $scopeElementId = $this->createElement($projectId, $milestoneId);
        $this->repository->create($projectId, null, null, $scopeElementId, 0.0, 0.0, 'Nicolas', 'note scoped to a diagram');

        // WHEN listing annotations scoped to that same diagram
        $annotations = $this->repository->findAllByProjectScope($projectId, $scopeElementId);

        // THEN the annotation appears
        self::assertCount(1, $annotations);
        self::assertSame($scopeElementId, $annotations[0]['scope_element_id']);
    }

    #[Test]
    public function creating an annotation for an unknown project throws(): void
    {
        // GIVEN no project exists
        // WHEN creating an annotation for an unknown project id
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->create('00000000-0000-0000-0000-000000000000', null, null, null, 0.0, 0.0, 'Nicolas', 'note');
    }

    #[Test]
    public function creating an annotation linked to an unknown element throws(): void
    {
        // GIVEN a project with no matching element
        $projectId = $this->createProject();

        // WHEN creating an annotation linked to an unknown element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create($projectId, '00000000-0000-0000-0000-000000000000', null, null, 0.0, 0.0, 'Nicolas', 'note');
    }

    #[Test]
    public function creating an annotation linked to an unknown relation throws(): void
    {
        // GIVEN a project with no matching relation
        $projectId = $this->createProject();

        // WHEN creating an annotation linked to an unknown relation id
        // THEN a RelationNotFoundException is thrown
        $this->expectException(RelationNotFoundException::class);
        $this->repository->create($projectId, null, '00000000-0000-0000-0000-000000000000', null, 0.0, 0.0, 'Nicolas', 'note');
    }

    #[Test]
    public function creating an annotation with an unknown scope element throws(): void
    {
        // GIVEN a project
        $projectId = $this->createProject();

        // WHEN creating an annotation with an unknown scope_element_id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create($projectId, null, null, '00000000-0000-0000-0000-000000000000', 0.0, 0.0, 'Nicolas', 'note');
    }

    #[Test]
    public function it updates an annotations text and position(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject();
        $annotation = $this->repository->create($projectId, null, null, null, 0.0, 0.0, 'Nicolas', 'old body');
        self::assertIsString($annotation['id']);

        // WHEN updating its text and position
        $updated = $this->repository->update($annotation['id'], 'Someone else', 'new body', 50.0, 60.0, null, null);

        // THEN the returned annotation carries the new attributes
        self::assertSame($annotation['id'], $updated['id']);
        self::assertSame('Someone else', $updated['author_name']);
        self::assertSame('new body', $updated['body']);
        self::assertSame(50.0, $updated['x']);
        self::assertSame(60.0, $updated['y']);
    }

    #[Test]
    public function it links an annotation to an element on update(): void
    {
        // GIVEN an existing annotation with no link, and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $annotation = $this->repository->create($projectId, null, null, null, 0.0, 0.0, 'Nicolas', 'note');
        self::assertIsString($annotation['id']);

        // WHEN updating it with an element link
        $updated = $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, $elementId, null);

        // THEN the returned annotation carries the element link
        self::assertSame($elementId, $updated['element_id']);
        self::assertNull($updated['relation_id']);
    }

    #[Test]
    public function it clears an annotations link when updated with no link(): void
    {
        // GIVEN an annotation linked to an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $annotation = $this->repository->create($projectId, $elementId, null, null, 0.0, 0.0, 'Nicolas', 'note');
        self::assertIsString($annotation['id']);

        // WHEN updating it with no link
        $updated = $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, null, null);

        // THEN the link is cleared
        self::assertNull($updated['element_id']);
    }

    #[Test]
    public function updating an annotation with an unknown element link throws(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject();
        $annotation = $this->repository->create($projectId, null, null, null, 0.0, 0.0, 'Nicolas', 'note');
        self::assertIsString($annotation['id']);

        // WHEN updating it with an unknown element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, '00000000-0000-0000-0000-000000000000', null);
    }

    #[Test]
    public function updating an unknown annotation throws(): void
    {
        // GIVEN no annotation exists
        // WHEN updating an unknown annotation
        // THEN an AnnotationNotFoundException is thrown
        $this->expectException(AnnotationNotFoundException::class);
        $this->repository->update('00000000-0000-0000-0000-000000000000', 'Nicolas', 'body', 0.0, 0.0, null, null);
    }

    #[Test]
    public function deleting an annotation removes it from the project scope list(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject();
        $annotation = $this->repository->create($projectId, null, null, null, 0.0, 0.0, 'Nicolas', 'body');
        self::assertIsString($annotation['id']);

        // WHEN deleting it
        $this->repository->delete($annotation['id']);

        // THEN it no longer appears in the project's annotation list
        self::assertCount(0, $this->repository->findAllByProjectScope($projectId, null));
    }

    #[Test]
    public function deleting an unknown annotation throws(): void
    {
        // GIVEN no annotation exists
        // WHEN deleting an unknown annotation
        // THEN an AnnotationNotFoundException is thrown
        $this->expectException(AnnotationNotFoundException::class);
        $this->repository->delete('00000000-0000-0000-0000-000000000000');
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\AnnotationNotFoundException;
use App\Repository\AnnotationRepositoryInterface;
use App\Repository\ElementNotFoundException;
use App\Repository\InvalidAnnotationLinkException;
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

        // WHEN creating an annotation with just a position — no links
        $annotation = $this->repository->create($projectId, null, 120.0, 80.0, 'Nicolas', 'Needs a data owner');

        // THEN the created annotation carries the given position and attributes, with no links
        self::assertSame($projectId, $annotation['project_id']);
        self::assertSame([], $annotation['links']);
        self::assertSame(120.0, $annotation['x']);
        self::assertSame(80.0, $annotation['y']);
        self::assertSame('Nicolas', $annotation['author_name']);
        self::assertSame('Needs a data owner', $annotation['body']);
    }

    #[Test]
    public function it creates an annotation linked to an element(): void
    {
        // GIVEN a project and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN creating an annotation linked to that element
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $elementId],
        ]);

        // THEN the created annotation carries a single link to that element
        self::assertCount(1, $annotation['links']);
        self::assertSame($elementId, $annotation['links'][0]['element_id']);
        self::assertNull($annotation['links'][0]['relation_id']);
        self::assertNull($annotation['links'][0]['target_annotation_id']);
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
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['relation_id' => $relationId],
        ]);

        // THEN the created annotation carries a single link to that relation
        self::assertCount(1, $annotation['links']);
        self::assertSame($relationId, $annotation['links'][0]['relation_id']);
        self::assertNull($annotation['links'][0]['element_id']);
    }

    #[Test]
    public function it creates an annotation linked to several elements(): void
    {
        // GIVEN a project and two elements
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $firstElementId = $this->createElement($projectId, $milestoneId);
        $secondElementId = $this->createElement($projectId, $milestoneId);

        // WHEN creating an annotation linked to both elements
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $firstElementId],
            ['element_id' => $secondElementId],
        ]);

        // THEN the created annotation carries both links
        self::assertCount(2, $annotation['links']);
        $linkedElementIds = array_map(static fn (array $link): ?string => $link['element_id'], $annotation['links']);
        self::assertEqualsCanonicalizing([$firstElementId, $secondElementId], $linkedElementIds);
    }

    #[Test]
    public function it creates an annotation linked to both an element and a relation(): void
    {
        // GIVEN a project, an element, and a relation — no longer mutually exclusive at the
        // annotation level, only per-link-entry XOR
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);

        // WHEN creating an annotation linked to both the element and the relation
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $sourceId],
            ['relation_id' => $relationId],
        ]);

        // THEN both links are carried
        self::assertCount(2, $annotation['links']);
        self::assertSame($sourceId, $annotation['links'][0]['element_id']);
        self::assertSame($relationId, $annotation['links'][1]['relation_id']);
    }

    #[Test]
    public function it creates an annotation linked to another annotation(): void
    {
        // GIVEN an existing note
        $projectId = $this->createProject();
        $firstNote = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'first note');

        // WHEN creating a second note linked to the first
        $secondNote = $this->repository->create($projectId, null, 10.0, 10.0, 'Nicolas', 'second note', [
            ['target_annotation_id' => $firstNote['id']],
        ]);

        // THEN the second note carries a link to the first
        self::assertCount(1, $secondNote['links']);
        self::assertSame($firstNote['id'], $secondNote['links'][0]['target_annotation_id']);
        self::assertNull($secondNote['links'][0]['element_id']);
        self::assertNull($secondNote['links'][0]['relation_id']);
    }

    #[Test]
    public function a duplicate link is silently deduped rather than rejected(): void
    {
        // GIVEN a project and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN creating an annotation with the same element link listed twice
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $elementId],
            ['element_id' => $elementId],
        ]);

        // THEN only one link is persisted, no error is raised
        self::assertCount(1, $annotation['links']);
        self::assertSame($elementId, $annotation['links'][0]['element_id']);
    }

    #[Test]
    public function it persists the given anchor when creating an annotation linked to an element(): void
    {
        // GIVEN a project and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN creating an annotation linked to that element, anchored from the note's right edge
        // to the element's center
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $elementId, 'source_handle' => 'right', 'target_handle' => 'center'],
        ]);

        // THEN the created link carries the given anchor
        self::assertSame('right', $annotation['links'][0]['source_handle']);
        self::assertSame('center', $annotation['links'][0]['target_handle']);
    }

    #[Test]
    public function it leaves the anchor null when linking without one(): void
    {
        // GIVEN a project and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);

        // WHEN creating an annotation linked to that element without specifying an anchor
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $elementId],
        ]);

        // THEN no anchor is persisted on the link
        self::assertNull($annotation['links'][0]['source_handle']);
        self::assertNull($annotation['links'][0]['target_handle']);
    }

    #[Test]
    public function a created annotation appears in the project scope list(): void
    {
        // GIVEN an annotation created with no scope element (the C1 root)
        $projectId = $this->createProject();
        $this->repository->create($projectId, null, 10.0, 20.0, 'Nicolas', 'note');

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
        $this->repository->create($projectId, $scopeElementId, 0.0, 0.0, 'Nicolas', 'note scoped to a diagram');

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
        $this->repository->create($projectId, $scopeElementId, 0.0, 0.0, 'Nicolas', 'note scoped to a diagram');

        // WHEN listing annotations scoped to that same diagram
        $annotations = $this->repository->findAllByProjectScope($projectId, $scopeElementId);

        // THEN the annotation appears
        self::assertCount(1, $annotations);
        self::assertSame($scopeElementId, $annotations[0]['scope_element_id']);
    }

    #[Test]
    public function a listed annotation carries its links(): void
    {
        // GIVEN an annotation linked to an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $elementId],
        ]);

        // WHEN listing annotations for the project
        $annotations = $this->repository->findAllByProjectScope($projectId, null);

        // THEN the listed annotation carries its link
        self::assertCount(1, $annotations);
        self::assertCount(1, $annotations[0]['links']);
        self::assertSame($elementId, $annotations[0]['links'][0]['element_id']);
    }

    #[Test]
    public function creating an annotation for an unknown project throws(): void
    {
        // GIVEN no project exists
        // WHEN creating an annotation for an unknown project id
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->create('00000000-0000-0000-0000-000000000000', null, 0.0, 0.0, 'Nicolas', 'note');
    }

    #[Test]
    public function creating an annotation linked to an unknown element throws(): void
    {
        // GIVEN a project with no matching element
        $projectId = $this->createProject();

        // WHEN creating an annotation linked to an unknown element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => '00000000-0000-0000-0000-000000000000'],
        ]);
    }

    #[Test]
    public function creating an annotation linked to an unknown relation throws(): void
    {
        // GIVEN a project with no matching relation
        $projectId = $this->createProject();

        // WHEN creating an annotation linked to an unknown relation id
        // THEN a RelationNotFoundException is thrown
        $this->expectException(RelationNotFoundException::class);
        $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['relation_id' => '00000000-0000-0000-0000-000000000000'],
        ]);
    }

    #[Test]
    public function creating an annotation linked to an unknown target annotation throws(): void
    {
        // GIVEN a project with no matching annotation
        $projectId = $this->createProject();

        // WHEN creating an annotation linked to an unknown target_annotation_id
        // THEN an InvalidAnnotationLinkException is thrown
        $this->expectException(InvalidAnnotationLinkException::class);
        $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['target_annotation_id' => '00000000-0000-0000-0000-000000000000'],
        ]);
    }

    #[Test]
    public function creating an annotation with an unknown scope element throws(): void
    {
        // GIVEN a project
        $projectId = $this->createProject();

        // WHEN creating an annotation with an unknown scope_element_id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->create($projectId, '00000000-0000-0000-0000-000000000000', 0.0, 0.0, 'Nicolas', 'note');
    }

    #[Test]
    public function it updates an annotations text and position(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject();
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'old body');

        // WHEN updating its text and position
        $updated = $this->repository->update($annotation['id'], 'Someone else', 'new body', 50.0, 60.0);

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
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note');

        // WHEN updating it with an element link
        $updated = $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, [
            ['element_id' => $elementId],
        ]);

        // THEN the returned annotation carries the element link
        self::assertCount(1, $updated['links']);
        self::assertSame($elementId, $updated['links'][0]['element_id']);
        self::assertNull($updated['links'][0]['relation_id']);
    }

    #[Test]
    public function it persists the given anchor when linking an annotation to an element on update(): void
    {
        // GIVEN an existing annotation with no link, and an element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $elementId = $this->createElement($projectId, $milestoneId);
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note');

        // WHEN updating it with an element link anchored from the note's top edge to the
        // element's left edge
        $updated = $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, [
            ['element_id' => $elementId, 'source_handle' => 'top', 'target_handle' => 'left'],
        ]);

        // THEN the returned link carries the given anchor
        self::assertSame('top', $updated['links'][0]['source_handle']);
        self::assertSame('left', $updated['links'][0]['target_handle']);
    }

    #[Test]
    public function it fully replaces the links on update(): void
    {
        // GIVEN an annotation linked to one element
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $firstElementId = $this->createElement($projectId, $milestoneId);
        $secondElementId = $this->createElement($projectId, $milestoneId);
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $firstElementId],
        ]);

        // WHEN updating it with a link to a different element
        $updated = $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, [
            ['element_id' => $secondElementId],
        ]);

        // THEN only the new link remains — the old one is gone, not appended to
        self::assertCount(1, $updated['links']);
        self::assertSame($secondElementId, $updated['links'][0]['element_id']);
    }

    #[Test]
    public function it clears all links when updated with an empty array(): void
    {
        // GIVEN an annotation linked to an element and a relation
        $projectId = $this->createProject();
        $milestoneId = $this->createMilestone($projectId);
        $sourceId = $this->createElement($projectId, $milestoneId);
        $targetId = $this->createElement($projectId, $milestoneId);
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note', [
            ['element_id' => $sourceId],
            ['relation_id' => $relationId],
        ]);

        // WHEN updating it with an empty links array
        $updated = $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, []);

        // THEN all links are cleared
        self::assertSame([], $updated['links']);
    }

    #[Test]
    public function it links an annotation to another annotation on update(): void
    {
        // GIVEN two existing notes
        $projectId = $this->createProject();
        $firstNote = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'first note');
        $secondNote = $this->repository->create($projectId, null, 10.0, 10.0, 'Nicolas', 'second note');

        // WHEN updating the second note with a link to the first
        $updated = $this->repository->update($secondNote['id'], 'Nicolas', 'second note', 10.0, 10.0, [
            ['target_annotation_id' => $firstNote['id']],
        ]);

        // THEN the second note carries a link to the first
        self::assertCount(1, $updated['links']);
        self::assertSame($firstNote['id'], $updated['links'][0]['target_annotation_id']);
    }

    #[Test]
    public function a self link is rejected on update(): void
    {
        // GIVEN an existing note
        $projectId = $this->createProject();
        $note = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note');

        // WHEN updating it with a link to itself
        // THEN an InvalidAnnotationLinkException is thrown
        $this->expectException(InvalidAnnotationLinkException::class);
        $this->repository->update($note['id'], 'Nicolas', 'note', 0.0, 0.0, [
            ['target_annotation_id' => $note['id']],
        ]);
    }

    #[Test]
    public function updating an annotation with an unknown element link throws(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject();
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'note');

        // WHEN updating it with an unknown element id
        // THEN an ElementNotFoundException is thrown
        $this->expectException(ElementNotFoundException::class);
        $this->repository->update($annotation['id'], 'Nicolas', 'note', 0.0, 0.0, [
            ['element_id' => '00000000-0000-0000-0000-000000000000'],
        ]);
    }

    #[Test]
    public function updating an unknown annotation throws(): void
    {
        // GIVEN no annotation exists
        // WHEN updating an unknown annotation
        // THEN an AnnotationNotFoundException is thrown
        $this->expectException(AnnotationNotFoundException::class);
        $this->repository->update('00000000-0000-0000-0000-000000000000', 'Nicolas', 'body', 0.0, 0.0);
    }

    #[Test]
    public function deleting an annotation removes it from the project scope list(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject();
        $annotation = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'body');

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

    #[Test]
    public function deleting a note removes links pointing at it from other notes(): void
    {
        // GIVEN a note linked to by another note
        $projectId = $this->createProject();
        $targetNote = $this->repository->create($projectId, null, 0.0, 0.0, 'Nicolas', 'target note');
        $linkingNote = $this->repository->create($projectId, null, 10.0, 10.0, 'Nicolas', 'linking note', [
            ['target_annotation_id' => $targetNote['id']],
        ]);

        // WHEN deleting the linked-to note
        $this->repository->delete($targetNote['id']);

        // THEN the other note's link to it is gone too
        $remaining = $this->repository->findAllByProjectScope($projectId, null);
        self::assertCount(1, $remaining);
        self::assertSame($linkingNote['id'], $remaining[0]['id']);
        self::assertSame([], $remaining[0]['links']);
    }
}

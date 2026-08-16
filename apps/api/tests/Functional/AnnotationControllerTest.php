<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class AnnotationControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns an empty array when no annotation exists(): void
    {
        // GIVEN a project with no annotation
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN listing its annotations
        $this->client->request('GET', "/api/projects/{$projectId}/annotations");

        // THEN the response is an empty array
        self::assertResponseIsSuccessful();
        self::assertSame([], json_decode((string) $this->client->getResponse()->getContent(), true));
    }

    #[Test]
    public function it returns the created annotation at the given position(): void
    {
        // GIVEN a project
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN creating an annotation with just a position, no links
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 120.5,
            'y' => 80.5,
            'author_name' => 'Nicolas',
            'body' => 'This area is still under discussion',
        ], JSON_THROW_ON_ERROR));

        // THEN the created annotation is returned with a generated id, no links
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($projectId, $created['project_id']);
        self::assertSame([], $created['links']);
        self::assertSame(120.5, $created['x']);
        self::assertSame(80.5, $created['y']);
        self::assertSame('Nicolas', $created['author_name']);
        self::assertSame('This area is still under discussion', $created['body']);
        self::assertIsString($created['id']);
    }

    #[Test]
    public function it returns the created annotation linked to an element(): void
    {
        // GIVEN a project and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');

        // WHEN creating an annotation linked to that element
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'links' => [
                ['element_id' => $elementId],
            ],
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'Needs a data owner',
        ], JSON_THROW_ON_ERROR));

        // THEN the created annotation carries the element link
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsArray($created['links']);
        self::assertCount(1, $created['links']);
        self::assertIsArray($created['links'][0]);
        self::assertSame($elementId, $created['links'][0]['element_id']);
        self::assertNull($created['links'][0]['relation_id']);
    }

    #[Test]
    public function it returns the created annotation linked to several elements and a relation(): void
    {
        // GIVEN a project, two elements, and a relation between them
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payments');
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);

        // WHEN creating an annotation linked to both elements and the relation
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'links' => [
                ['element_id' => $sourceId],
                ['element_id' => $targetId],
                ['relation_id' => $relationId],
            ],
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'note',
        ], JSON_THROW_ON_ERROR));

        // THEN the created annotation carries all three links
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsArray($created['links']);
        self::assertCount(3, $created['links']);
    }

    #[Test]
    public function it returns the created annotation linked to another annotation(): void
    {
        // GIVEN an existing note
        $projectId = $this->createProject('Nanko', 'nanko');
        $firstNoteId = $this->createAnnotation($projectId, null);

        // WHEN creating a second note linked to the first
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'links' => [
                ['target_annotation_id' => $firstNoteId],
            ],
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'second note',
        ], JSON_THROW_ON_ERROR));

        // THEN the created annotation carries the note-to-note link
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsArray($created['links']);
        self::assertCount(1, $created['links']);
        self::assertIsArray($created['links'][0]);
        self::assertSame($firstNoteId, $created['links'][0]['target_annotation_id']);
    }

    #[Test]
    public function it returns 422 when a link references both an element and a relation(): void
    {
        // GIVEN a project, an element, and a relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payments');
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);

        // WHEN creating an annotation with a link that has both an element_id and a relation_id
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'links' => [
                ['element_id' => $sourceId, 'relation_id' => $relationId],
            ],
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'note',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 422 when x is missing(): void
    {
        // GIVEN a project
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN creating an annotation without a position
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'note',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 404 when the project does not exist(): void
    {
        // GIVEN no project with this id exists

        // WHEN creating an annotation for an unknown project
        $this->client->request('POST', '/api/projects/00000000-0000-0000-0000-000000000000/annotations', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'note',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
        $body = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }

    #[Test]
    public function a created annotation appears in the project list(): void
    {
        // GIVEN an annotation was created
        $projectId = $this->createProject('Nanko', 'nanko');
        $this->createAnnotation($projectId, null);

        // WHEN listing annotations for the project
        $this->client->request('GET', "/api/projects/{$projectId}/annotations");

        // THEN the created annotation appears in the list
        self::assertResponseIsSuccessful();
        $list = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($list);
        self::assertCount(1, $list);
    }

    #[Test]
    public function an annotation scoped to an element is excluded from the root scope list(): void
    {
        // GIVEN an annotation scoped to a diagram
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $scopeElementId = $this->createElement($projectId, $milestoneId, 'Booking system');
        $this->createAnnotation($projectId, $scopeElementId);

        // WHEN listing annotations scoped to the root
        $this->client->request('GET', "/api/projects/{$projectId}/annotations");

        // THEN the scoped annotation is not returned
        self::assertResponseIsSuccessful();
        $list = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertSame([], $list);

        // AND it is returned when listing that same scope
        $this->client->request('GET', "/api/projects/{$projectId}/annotations?scope_element_id={$scopeElementId}");
        $scoped = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($scoped);
        self::assertCount(1, $scoped);
    }

    #[Test]
    public function it updates an annotations text and position(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject('Nanko', 'nanko');
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN updating its author, body, and position
        $this->client->request('PATCH', "/api/annotations/{$annotationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Someone else',
            'body' => 'new body',
            'x' => 200.5,
            'y' => 300.5,
        ], JSON_THROW_ON_ERROR));

        // THEN the response reflects the new values
        self::assertResponseIsSuccessful();
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame('Someone else', $updated['author_name']);
        self::assertSame('new body', $updated['body']);
        self::assertSame(200.5, $updated['x']);
        self::assertSame(300.5, $updated['y']);
    }

    #[Test]
    public function it links an annotation to an element on update(): void
    {
        // GIVEN an existing annotation and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN updating it with an element link
        $this->client->request('PATCH', "/api/annotations/{$annotationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'links' => [
                ['element_id' => $elementId],
            ],
        ], JSON_THROW_ON_ERROR));

        // THEN the response carries the element link
        self::assertResponseIsSuccessful();
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertIsArray($updated['links']);
        self::assertCount(1, $updated['links']);
        self::assertIsArray($updated['links'][0]);
        self::assertSame($elementId, $updated['links'][0]['element_id']);
    }

    #[Test]
    public function it links an annotation to several elements on update(): void
    {
        // GIVEN an existing annotation and two elements
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $firstElementId = $this->createElement($projectId, $milestoneId, 'Booking');
        $secondElementId = $this->createElement($projectId, $milestoneId, 'Payments');
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN updating it with links to both elements
        $this->client->request('PATCH', "/api/annotations/{$annotationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'links' => [
                ['element_id' => $firstElementId],
                ['element_id' => $secondElementId],
            ],
        ], JSON_THROW_ON_ERROR));

        // THEN the response carries both links
        self::assertResponseIsSuccessful();
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertIsArray($updated['links']);
        self::assertCount(2, $updated['links']);
    }

    #[Test]
    public function it links an annotation to another annotation on update(): void
    {
        // GIVEN two existing notes
        $projectId = $this->createProject('Nanko', 'nanko');
        $firstNoteId = $this->createAnnotation($projectId, null);
        $secondNoteId = $this->createAnnotation($projectId, null);

        // WHEN updating the second note with a link to the first
        $this->client->request('PATCH', "/api/annotations/{$secondNoteId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'links' => [
                ['target_annotation_id' => $firstNoteId],
            ],
        ], JSON_THROW_ON_ERROR));

        // THEN the response carries the note-to-note link
        self::assertResponseIsSuccessful();
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertIsArray($updated['links']);
        self::assertCount(1, $updated['links']);
        self::assertIsArray($updated['links'][0]);
        self::assertSame($firstNoteId, $updated['links'][0]['target_annotation_id']);
    }

    #[Test]
    public function it returns 422 when updating an annotation with a link to itself(): void
    {
        // GIVEN an existing note
        $projectId = $this->createProject('Nanko', 'nanko');
        $noteId = $this->createAnnotation($projectId, null);

        // WHEN updating it with a link to itself
        $this->client->request('PATCH', "/api/annotations/{$noteId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'links' => [
                ['target_annotation_id' => $noteId],
            ],
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it persists the anchor when linking an annotation to an element(): void
    {
        // GIVEN an existing annotation and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN updating it with an element link anchored from the note's right edge to the
        // element's center
        $this->client->request('PATCH', "/api/annotations/{$annotationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'links' => [
                ['element_id' => $elementId, 'source_handle' => 'right', 'target_handle' => 'center'],
            ],
        ], JSON_THROW_ON_ERROR));

        // THEN the response carries the given anchor
        self::assertResponseIsSuccessful();
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertIsArray($updated['links']);
        self::assertIsArray($updated['links'][0]);
        self::assertSame('right', $updated['links'][0]['source_handle']);
        self::assertSame('center', $updated['links'][0]['target_handle']);
    }

    #[Test]
    public function it returns 422 when a link on update references both an element and a relation(): void
    {
        // GIVEN a project, an element, and a relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payments');
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN updating it with a link that has both an element_id and a relation_id
        $this->client->request('PATCH', "/api/annotations/{$annotationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'links' => [
                ['element_id' => $sourceId, 'relation_id' => $relationId],
            ],
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 404 when updating an unknown annotation(): void
    {
        // GIVEN no annotation with this id exists

        // WHEN updating an unknown annotation
        $this->client->request('PATCH', '/api/annotations/00000000-0000-0000-0000-000000000000', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it deletes an annotation(): void
    {
        // GIVEN an existing annotation
        $projectId = $this->createProject('Nanko', 'nanko');
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN deleting it
        $this->client->request('DELETE', "/api/annotations/{$annotationId}");

        // THEN the request succeeds and the annotation no longer appears in the list
        self::assertResponseStatusCodeSame(204);
        $this->client->request('GET', "/api/projects/{$projectId}/annotations");
        self::assertSame([], json_decode((string) $this->client->getResponse()->getContent(), true));
    }

    #[Test]
    public function it returns 404 when deleting an unknown annotation(): void
    {
        // GIVEN no annotation with this id exists

        // WHEN deleting an unknown annotation
        $this->client->request('DELETE', '/api/annotations/00000000-0000-0000-0000-000000000000');

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    private function createProject(string $name, string $slug): string
    {
        $this->client->request('POST', '/api/projects', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'name' => $name,
            'slug' => $slug,
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }

    private function createMilestone(string $projectId, string $label): string
    {
        $this->client->request('POST', "/api/projects/{$projectId}/milestones", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'label' => $label,
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }

    private function createElement(string $projectId, string $milestoneId, string $name): string
    {
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'system',
            'name' => $name,
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }

    private function createRelation(string $projectId, string $milestoneId, string $sourceId, string $targetId): string
    {
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }

    private function createAnnotation(string $projectId, ?string $scopeElementId): string
    {
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'scope_element_id' => $scopeElementId,
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'note',
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }
}

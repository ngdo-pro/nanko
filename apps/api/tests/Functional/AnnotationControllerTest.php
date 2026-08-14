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

        // WHEN creating an annotation with just a position, no element/relation link
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 120.5,
            'y' => 80.5,
            'author_name' => 'Nicolas',
            'body' => 'This area is still under discussion',
        ], JSON_THROW_ON_ERROR));

        // THEN the created annotation is returned with a generated id, no link
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($projectId, $created['project_id']);
        self::assertNull($created['element_id']);
        self::assertNull($created['relation_id']);
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
            'element_id' => $elementId,
            'x' => 0.0,
            'y' => 0.0,
            'author_name' => 'Nicolas',
            'body' => 'Needs a data owner',
        ], JSON_THROW_ON_ERROR));

        // THEN the created annotation carries the element link
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($elementId, $created['element_id']);
        self::assertNull($created['relation_id']);
    }

    #[Test]
    public function it returns 422 when linked to both an element and a relation(): void
    {
        // GIVEN a project, an element, and a relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payments');
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);

        // WHEN creating an annotation with both an element_id and a relation_id
        $this->client->request('POST', "/api/projects/{$projectId}/annotations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'element_id' => $sourceId,
            'relation_id' => $relationId,
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
            'element_id' => $elementId,
        ], JSON_THROW_ON_ERROR));

        // THEN the response carries the element link
        self::assertResponseIsSuccessful();
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame($elementId, $updated['element_id']);
    }

    #[Test]
    public function it returns 422 when updating with a link to both an element and a relation(): void
    {
        // GIVEN a project, an element, and a relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payments');
        $relationId = $this->createRelation($projectId, $milestoneId, $sourceId, $targetId);
        $annotationId = $this->createAnnotation($projectId, null);

        // WHEN updating it with both an element_id and a relation_id
        $this->client->request('PATCH', "/api/annotations/{$annotationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'author_name' => 'Nicolas',
            'body' => 'note',
            'x' => 0.0,
            'y' => 0.0,
            'element_id' => $sourceId,
            'relation_id' => $relationId,
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

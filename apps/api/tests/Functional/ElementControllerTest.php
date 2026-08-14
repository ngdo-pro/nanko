<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class ElementControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns the created element(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN creating an element
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'system',
            'name' => 'Booking',
            'description' => 'Handles bookings',
            'technology' => 'Symfony',
        ], JSON_THROW_ON_ERROR));

        // THEN the created element is returned with a generated id
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($projectId, $created['project_id']);
        self::assertSame($milestoneId, $created['milestone_id']);
        self::assertSame('system', $created['kind']);
        self::assertSame('Booking', $created['name']);
        self::assertSame('Handles bookings', $created['description']);
        self::assertSame('Symfony', $created['technology']);
        self::assertFalse($created['is_external']);
        self::assertNull($created['parent_id']);
        self::assertIsString($created['id']);
    }

    #[Test]
    public function it creates a child element referencing its parent(): void
    {
        // GIVEN a top-level element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $parentId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');

        // WHEN creating a child element under it
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'container',
            'name' => 'API',
            'parent_id' => $parentId,
        ], JSON_THROW_ON_ERROR));

        // THEN the child references its parent
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($parentId, $created['parent_id']);
    }

    #[Test]
    public function it returns 422 when the kind is not one of the v1 levels(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN creating an element with an out-of-scope kind
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'person',
            'name' => 'Client',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 422 when is_external is not a boolean(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN creating an element with a non-boolean is_external
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'system',
            'name' => 'Booking',
            'is_external' => 'yes',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 404 when the project does not exist(): void
    {
        // GIVEN no project with this id exists

        // WHEN creating an element for an unknown project
        $this->client->request('POST', '/api/projects/00000000-0000-0000-0000-000000000000/elements', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => '00000000-0000-0000-0000-000000000000',
            'kind' => 'system',
            'name' => 'Booking',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
        $body = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }

    #[Test]
    public function it returns 404 when the milestone does not exist(): void
    {
        // GIVEN a project with no matching milestone
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN creating an element with an unknown milestone id
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => '00000000-0000-0000-0000-000000000000',
            'kind' => 'system',
            'name' => 'Booking',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns the updated element(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');

        // WHEN renaming it
        $this->client->request('PATCH', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'name' => 'Payments',
            'description' => 'Handles payments',
            'technology' => 'Symfony',
        ], JSON_THROW_ON_ERROR));

        // THEN the updated element is returned
        self::assertResponseStatusCodeSame(200);
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame($elementId, $updated['id']);
        self::assertSame($milestoneId, $updated['milestone_id']);
        self::assertSame('Payments', $updated['name']);
        self::assertSame('Handles payments', $updated['description']);
        self::assertSame('Symfony', $updated['technology']);
    }

    #[Test]
    public function it reflects the rename in the graph at that milestone(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');

        // WHEN renaming it at the same milestone
        $this->client->request('PATCH', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'name' => 'Payments',
        ], JSON_THROW_ON_ERROR));
        self::assertResponseStatusCodeSame(200);

        // THEN the graph at that milestone shows the new name
        $this->client->request('GET', "/api/projects/{$projectId}/graph?milestone_id={$milestoneId}");
        $graph = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($graph);
        self::assertIsArray($graph['elements']);
        self::assertIsArray($graph['elements'][0]);
        self::assertSame('Payments', $graph['elements'][0]['name']);
    }

    #[Test]
    public function it returns 404 when updating an unknown element(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN updating an unknown element
        $this->client->request('PATCH', '/api/elements/00000000-0000-0000-0000-000000000000', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'name' => 'Booking',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 404 when updating an element with an unknown milestone(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');

        // WHEN updating it with an unknown milestone id
        $this->client->request('PATCH', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => '00000000-0000-0000-0000-000000000000',
            'name' => 'Payments',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 422 when the name is missing on update(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');

        // WHEN updating it without a name
        $this->client->request('PATCH', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it soft deletes the element(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');
        $deleteMilestoneId = $this->createMilestone($projectId, 'Deprecation');

        // WHEN deleting it at a later milestone
        $this->client->request('DELETE', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $deleteMilestoneId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request succeeds with no content, and the element is no longer visible at that milestone
        self::assertResponseStatusCodeSame(204);
        $this->client->request('GET', "/api/projects/{$projectId}/graph?milestone_id={$deleteMilestoneId}");
        $graph = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($graph);
        self::assertIsArray($graph['elements']);
        self::assertCount(0, $graph['elements']);
    }

    #[Test]
    public function it returns 404 when deleting an unknown element(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN deleting an unknown element
        $this->client->request('DELETE', '/api/elements/00000000-0000-0000-0000-000000000000', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 422 when milestone id is missing on delete(): void
    {
        // GIVEN an existing element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'system', 'Booking');

        // WHEN deleting it without a milestone_id
        $this->client->request('DELETE', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns the given archetype on create(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN creating a container tagged as a database
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'container',
            'name' => 'Primary DB',
            'technology' => 'Postgres',
            'archetype' => 'database',
        ], JSON_THROW_ON_ERROR));

        // THEN the created element carries the given archetype
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame('database', $created['archetype']);
    }

    #[Test]
    public function it returns 422 when the archetype is not one of the known values(): void
    {
        // GIVEN a project and a milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN creating an element with an unknown archetype
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => 'container',
            'name' => 'Mystery',
            'archetype' => 'spaceship',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it updates the archetype(): void
    {
        // GIVEN an existing element with no archetype
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'container', 'Queue');

        // WHEN updating it with an archetype
        $this->client->request('PATCH', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'name' => 'Queue',
            'archetype' => 'queue',
        ], JSON_THROW_ON_ERROR));

        // THEN the updated element carries the new archetype
        self::assertResponseStatusCodeSame(200);
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame('queue', $updated['archetype']);
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

    private function createElement(string $projectId, string $milestoneId, string $kind, string $name): string
    {
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => $kind,
            'name' => $name,
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }
}

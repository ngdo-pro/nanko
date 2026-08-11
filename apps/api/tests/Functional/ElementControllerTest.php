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
    public function it returns 400 when the kind is not one of the v1 levels(): void
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
        self::assertResponseStatusCodeSame(400);
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

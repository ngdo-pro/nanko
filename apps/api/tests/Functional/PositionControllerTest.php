<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class PositionControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns the upserted default position(): void
    {
        // GIVEN a project, a milestone, and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');

        // WHEN upserting a default position for that element
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 100.5,
            'y' => 200.5,
        ], JSON_THROW_ON_ERROR));

        // THEN the upserted position is returned
        self::assertResponseStatusCodeSame(200);
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame($elementId, $updated['element_id']);
        self::assertNull($updated['milestone_id']);
        self::assertSame(100.5, $updated['x']);
        self::assertSame(200.5, $updated['y']);
    }

    #[Test]
    public function it returns the upserted milestone specific position(): void
    {
        // GIVEN a project, a milestone, and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');

        // WHEN upserting a position scoped to that milestone
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'x' => 10.0,
            'y' => 20.0,
        ], JSON_THROW_ON_ERROR));

        // THEN the position carries the given milestone
        self::assertResponseStatusCodeSame(200);
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame($milestoneId, $updated['milestone_id']);
    }

    #[Test]
    public function upserting twice updates the position in place(): void
    {
        // GIVEN an element with an existing default position
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 1.5,
            'y' => 1.5,
        ], JSON_THROW_ON_ERROR));

        // WHEN upserting a default position again for the same element
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 5.5,
            'y' => 6.5,
        ], JSON_THROW_ON_ERROR));

        // THEN the same position row is returned with the updated coordinates
        self::assertResponseStatusCodeSame(200);
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame(5.5, $updated['x']);
        self::assertSame(6.5, $updated['y']);
    }

    #[Test]
    public function it returns 422 when x is missing(): void
    {
        // GIVEN a project, a milestone, and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');

        // WHEN upserting a position without x
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'y' => 200.0,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 422 when x is not a number(): void
    {
        // GIVEN a project, a milestone, and an element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');

        // WHEN upserting a position with a non-numeric x
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 'abc',
            'y' => 200.0,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 404 when the element does not exist(): void
    {
        // GIVEN no element with this id exists

        // WHEN upserting a position for an unknown element
        $this->client->request('PATCH', '/api/elements/00000000-0000-0000-0000-000000000000/position', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'x' => 0.0,
            'y' => 0.0,
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
        // GIVEN a project and an element, but no matching milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $milestoneId, 'Booking');

        // WHEN upserting a position with an unknown milestone id
        $this->client->request('PATCH', "/api/elements/{$elementId}/position", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => '00000000-0000-0000-0000-000000000000',
            'x' => 0.0,
            'y' => 0.0,
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
}

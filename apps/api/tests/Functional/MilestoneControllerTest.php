<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class MilestoneControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns an empty array when no milestone exists(): void
    {
        // GIVEN a project with no milestone
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN listing its milestones
        $this->client->request('GET', "/api/projects/{$projectId}/milestones");

        // THEN the response is an empty array
        self::assertResponseIsSuccessful();
        self::assertSame([], json_decode((string) $this->client->getResponse()->getContent(), true));
    }

    #[Test]
    public function it returns the created milestone(): void
    {
        // GIVEN a project
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN creating a milestone
        $this->client->request('POST', "/api/projects/{$projectId}/milestones", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'label' => 'Launch',
            'occurs_on' => '2026-03-01',
        ], JSON_THROW_ON_ERROR));

        // THEN the created milestone is returned with a generated id and sort_order zero
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($projectId, $created['project_id']);
        self::assertSame('Launch', $created['label']);
        self::assertSame('2026-03-01', $created['occurs_on']);
        self::assertSame(0, $created['sort_order']);
        self::assertIsString($created['id']);
        self::assertArrayHasKey('created_at', $created);
    }

    #[Test]
    public function a created milestone appears in the list(): void
    {
        // GIVEN a milestone was created
        $projectId = $this->createProject('Nanko', 'nanko');
        $this->createMilestone($projectId, 'Launch');

        // WHEN listing milestones for the project
        $this->client->request('GET', "/api/projects/{$projectId}/milestones");

        // THEN the created milestone appears in the list
        self::assertResponseIsSuccessful();
        $list = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($list);
        self::assertCount(1, $list);
        self::assertIsArray($list[0]);
        self::assertSame('Launch', $list[0]['label']);
    }

    #[Test]
    public function it returns 422 when the label is missing(): void
    {
        // GIVEN a project
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN creating a milestone without a label
        $this->client->request('POST', "/api/projects/{$projectId}/milestones", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'occurs_on' => '2026-03-01',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 422 when occurs on is not a valid date(): void
    {
        // GIVEN a project
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN creating a milestone with a malformed occurs_on
        $this->client->request('POST', "/api/projects/{$projectId}/milestones", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'label' => 'Launch',
            'occurs_on' => 'not-a-date',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 404 when the project does not exist(): void
    {
        // GIVEN no project with this id exists

        // WHEN creating a milestone for an unknown project
        $this->client->request('POST', '/api/projects/00000000-0000-0000-0000-000000000000/milestones', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'label' => 'Launch',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
        $body = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
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
}

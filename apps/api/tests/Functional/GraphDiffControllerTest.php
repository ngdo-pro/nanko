<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class GraphDiffControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it reports an element created after the from milestone as added(): void
    {
        // GIVEN a system created only at the second of two milestones
        $projectId = $this->createProject('Nanko', 'nanko');
        $fromMilestoneId = $this->createMilestone($projectId, 'Kickoff');
        $toMilestoneId = $this->createMilestone($projectId, 'Launch');
        $elementId = $this->createElement($projectId, $toMilestoneId, null, 'Booking');

        // WHEN requesting the diff between the two milestones
        $this->client->request('GET', "/api/projects/{$projectId}/diff?from_milestone_id={$fromMilestoneId}&to_milestone_id={$toMilestoneId}");

        // THEN the element is reported as added
        self::assertResponseIsSuccessful();
        $diff = $this->diffBody();
        self::assertSame([['id' => $elementId, 'status' => 'added', 'changed_fields' => []]], $diff['elements']);
    }

    #[Test]
    public function it reports an element renamed between the two milestones as modified(): void
    {
        // GIVEN a system created at the first milestone and renamed at the second
        $projectId = $this->createProject('Nanko', 'nanko');
        $fromMilestoneId = $this->createMilestone($projectId, 'Kickoff');
        $elementId = $this->createElement($projectId, $fromMilestoneId, null, 'Booking');
        $toMilestoneId = $this->createMilestone($projectId, 'Launch');
        $this->renameElement($elementId, $toMilestoneId, 'Booking v2');

        // WHEN requesting the diff between the two milestones
        $this->client->request('GET', "/api/projects/{$projectId}/diff?from_milestone_id={$fromMilestoneId}&to_milestone_id={$toMilestoneId}");

        // THEN the element is reported as modified, with "name" as a changed field
        self::assertResponseIsSuccessful();
        $diff = $this->diffBody();
        self::assertSame([['id' => $elementId, 'status' => 'modified', 'changed_fields' => ['name']]], $diff['elements']);
    }

    #[Test]
    public function it reports an unchanged element present identically at both milestones(): void
    {
        // GIVEN a system created at the first milestone, untouched since
        $projectId = $this->createProject('Nanko', 'nanko');
        $fromMilestoneId = $this->createMilestone($projectId, 'Kickoff');
        $elementId = $this->createElement($projectId, $fromMilestoneId, null, 'Booking');
        $toMilestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN requesting the diff between the two milestones
        $this->client->request('GET', "/api/projects/{$projectId}/diff?from_milestone_id={$fromMilestoneId}&to_milestone_id={$toMilestoneId}");

        // THEN the element is reported as unchanged
        self::assertResponseIsSuccessful();
        $diff = $this->diffBody();
        self::assertSame([['id' => $elementId, 'status' => 'unchanged', 'changed_fields' => []]], $diff['elements']);
    }

    #[Test]
    public function it returns 404 when the from milestone does not exist(): void
    {
        // GIVEN a project with only one real milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $toMilestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN requesting a diff against an unknown "from" milestone
        $this->client->request('GET', "/api/projects/{$projectId}/diff?from_milestone_id=00000000-0000-0000-0000-000000000000&to_milestone_id={$toMilestoneId}");

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 404 when the to milestone does not exist(): void
    {
        // GIVEN a project with only one real milestone
        $projectId = $this->createProject('Nanko', 'nanko');
        $fromMilestoneId = $this->createMilestone($projectId, 'Kickoff');

        // WHEN requesting a diff against an unknown "to" milestone
        $this->client->request('GET', "/api/projects/{$projectId}/diff?from_milestone_id={$fromMilestoneId}&to_milestone_id=00000000-0000-0000-0000-000000000000");

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    /**
     * @return array<array-key, mixed>
     */
    private function diffBody(): array
    {
        $body = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertIsArray($body['elements']);
        self::assertIsArray($body['relations']);

        return $body;
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

    private function createElement(string $projectId, string $milestoneId, ?string $parentId, string $name): string
    {
        $this->client->request('POST', "/api/projects/{$projectId}/elements", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'kind' => $parentId === null ? 'system' : 'container',
            'parent_id' => $parentId,
            'name' => $name,
        ], JSON_THROW_ON_ERROR));

        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertIsString($created['id']);

        return $created['id'];
    }

    private function renameElement(string $elementId, string $milestoneId, string $name): void
    {
        $this->client->request('PATCH', "/api/elements/{$elementId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'name' => $name,
        ], JSON_THROW_ON_ERROR));

        self::assertResponseIsSuccessful();
    }
}

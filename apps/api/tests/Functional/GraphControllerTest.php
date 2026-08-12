<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class GraphControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns the elements and relations visible at the milestone(): void
    {
        // GIVEN a project with two systems and a container relation between their children
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceSystemId = $this->createElement($projectId, $milestoneId, null, 'Booking');
        $targetSystemId = $this->createElement($projectId, $milestoneId, null, 'Payment');
        $sourceContainerId = $this->createElement($projectId, $milestoneId, $sourceSystemId, 'API');
        $targetContainerId = $this->createElement($projectId, $milestoneId, $targetSystemId, 'API');
        $this->createRelation($projectId, $milestoneId, $sourceContainerId, $targetContainerId);

        // WHEN requesting the graph at that milestone, scoped to the source system
        $this->client->request('GET', "/api/projects/{$projectId}/graph?milestone_id={$milestoneId}&scope_element_id={$sourceSystemId}");

        // THEN the container relation between them is returned, with no warnings
        self::assertResponseIsSuccessful();
        $graph = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($graph);
        self::assertIsArray($graph['elements']);
        self::assertCount(4, $graph['elements']);
        self::assertIsArray($graph['relations']);
        self::assertCount(1, $graph['relations']);
        self::assertIsArray($graph['relations'][0]);
        self::assertSame($sourceContainerId, $graph['relations'][0]['source_element_id']);
        self::assertSame($targetContainerId, $graph['relations'][0]['target_element_id']);
        self::assertSame([], $graph['warnings']);
    }

    #[Test]
    public function it does not return an element created after the requested milestone(): void
    {
        // GIVEN an element created at a later milestone than the one requested
        $projectId = $this->createProject('Nanko', 'nanko');
        $pastMilestoneId = $this->createMilestone($projectId, 'Kickoff');
        $futureMilestoneId = $this->createMilestone($projectId, 'Launch');
        $this->createElement($projectId, $futureMilestoneId, null, 'Booking');

        // WHEN requesting the graph at the earlier milestone
        $this->client->request('GET', "/api/projects/{$projectId}/graph?milestone_id={$pastMilestoneId}");

        // THEN the element is not visible yet
        self::assertResponseIsSuccessful();
        $graph = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($graph);
        self::assertSame([], $graph['elements']);
    }

    #[Test]
    public function it returns 404 when the milestone id query parameter is missing(): void
    {
        // GIVEN a project
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN requesting the graph without a milestone_id
        $this->client->request('GET', "/api/projects/{$projectId}/graph");

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 404 when the milestone does not exist(): void
    {
        // GIVEN a project with no matching milestone
        $projectId = $this->createProject('Nanko', 'nanko');

        // WHEN requesting the graph with an unknown milestone id
        $this->client->request('GET', "/api/projects/{$projectId}/graph?milestone_id=00000000-0000-0000-0000-000000000000");

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
}

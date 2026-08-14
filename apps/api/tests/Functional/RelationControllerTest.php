<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class RelationControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns the created relation(): void
    {
        // GIVEN a project, a milestone, and two elements
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');

        // WHEN creating a relation between them
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
            'label' => 'reads/writes',
            'technology' => 'HTTP',
        ], JSON_THROW_ON_ERROR));

        // THEN the created relation is returned with a generated id
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame($projectId, $created['project_id']);
        self::assertSame($milestoneId, $created['milestone_id']);
        self::assertSame($sourceId, $created['source_element_id']);
        self::assertSame($targetId, $created['target_element_id']);
        self::assertSame('declared', $created['status']);
        self::assertSame('reads/writes', $created['label']);
        self::assertSame('HTTP', $created['technology']);
        self::assertIsString($created['id']);
    }

    #[Test]
    public function it returns 422 when milestone_id is missing(): void
    {
        // GIVEN a project and two elements
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');

        // WHEN creating a relation without a milestone_id
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 404 when the project does not exist(): void
    {
        // GIVEN no project with this id exists

        // WHEN creating a relation for an unknown project
        $this->client->request('POST', '/api/projects/00000000-0000-0000-0000-000000000000/relations', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => '00000000-0000-0000-0000-000000000000',
            'source_element_id' => '00000000-0000-0000-0000-000000000001',
            'target_element_id' => '00000000-0000-0000-0000-000000000002',
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
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');

        // WHEN creating a relation with an unknown milestone id
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => '00000000-0000-0000-0000-000000000000',
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 404 when the source element does not exist(): void
    {
        // GIVEN a project, a milestone, and a real target element
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');

        // WHEN creating a relation with an unknown source element id
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => '00000000-0000-0000-0000-000000000000',
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 400 when the target element belongs to a different project(): void
    {
        // GIVEN a source element in the project, and a target element in another project
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');

        $otherProjectId = $this->createProject('Other', 'other');
        $otherMilestoneId = $this->createMilestone($otherProjectId, 'Launch');
        $foreignTargetId = $this->createElement($otherProjectId, $otherMilestoneId, 'Payment');

        // WHEN creating a relation using that foreign element as the target
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => $sourceId,
            'target_element_id' => $foreignTargetId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 400
        self::assertResponseStatusCodeSame(400);
    }

    #[Test]
    public function it returns the updated relation(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        $relationId = $created['id'];
        self::assertIsString($relationId);

        // WHEN updating its label and technology
        $this->client->request('PATCH', "/api/relations/{$relationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'label' => 'reads/writes',
            'technology' => 'HTTP',
        ], JSON_THROW_ON_ERROR));

        // THEN the updated relation is returned
        self::assertResponseStatusCodeSame(200);
        $updated = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($updated);
        self::assertSame($relationId, $updated['id']);
        self::assertSame($milestoneId, $updated['milestone_id']);
        self::assertSame('reads/writes', $updated['label']);
        self::assertSame('HTTP', $updated['technology']);
    }

    #[Test]
    public function it returns 404 when updating an unknown relation(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN updating an unknown relation
        $this->client->request('PATCH', '/api/relations/00000000-0000-0000-0000-000000000000', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'label' => 'reads/writes',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 404
        self::assertResponseStatusCodeSame(404);
    }

    #[Test]
    public function it returns 422 when milestone id is missing on update(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        $relationId = $created['id'];
        self::assertIsString($relationId);

        // WHEN updating it without a milestone_id
        $this->client->request('PATCH', "/api/relations/{$relationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'label' => 'reads/writes',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it soft deletes the relation(): void
    {
        // GIVEN an existing relation
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');
        $sourceId = $this->createElement($projectId, $milestoneId, 'Booking');
        $targetId = $this->createElement($projectId, $milestoneId, 'Payment');
        $this->client->request('POST', "/api/projects/{$projectId}/relations", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
            'source_element_id' => $sourceId,
            'target_element_id' => $targetId,
        ], JSON_THROW_ON_ERROR));
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        $relationId = $created['id'];
        self::assertIsString($relationId);
        $deleteMilestoneId = $this->createMilestone($projectId, 'Deprecation');

        // WHEN deleting it at a later milestone
        $this->client->request('DELETE', "/api/relations/{$relationId}", server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $deleteMilestoneId,
        ], JSON_THROW_ON_ERROR));

        // THEN the request succeeds with no content, and the relation is no longer visible at that milestone
        self::assertResponseStatusCodeSame(204);
        $this->client->request('GET', "/api/projects/{$projectId}/graph?milestone_id={$deleteMilestoneId}&scope_element_id={$sourceId}");
        $graph = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($graph);
        self::assertIsArray($graph['relations']);
        self::assertCount(0, $graph['relations']);
    }

    #[Test]
    public function it returns 404 when deleting an unknown relation(): void
    {
        // GIVEN a milestone that belongs to some real project
        $projectId = $this->createProject('Nanko', 'nanko');
        $milestoneId = $this->createMilestone($projectId, 'Launch');

        // WHEN deleting an unknown relation
        $this->client->request('DELETE', '/api/relations/00000000-0000-0000-0000-000000000000', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'milestone_id' => $milestoneId,
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

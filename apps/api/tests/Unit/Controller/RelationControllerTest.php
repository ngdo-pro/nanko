<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\RelationController;
use App\Dto\CreateRelationPayload;
use App\Tests\Support\InMemoryRelationRepository;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class RelationControllerTest extends TestCase
{
    private const string PROJECT_ID = '00000000-0000-0000-0000-000000000001';
    private const string MILESTONE_ID = '00000000-0000-0000-0000-000000000002';

    #[Test]
    public function it returns 404 when creating a relation for an unknown project(): void
    {
        // GIVEN a controller backed by an empty repository
        $repository = new InMemoryRelationRepository();
        $controller = new RelationController($repository);

        // WHEN creating a relation for an unregistered project
        $response = $controller->create(
            '00000000-0000-0000-0000-000000000000',
            new CreateRelationPayload(
                milestoneId: self::MILESTONE_ID,
                sourceElementId: '00000000-0000-0000-0000-000000000010',
                targetElementId: '00000000-0000-0000-0000-000000000011',
            ),
        );

        // THEN the request is rejected with a 404 and an error body
        self::assertSame(404, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }

    #[Test]
    public function it returns 400 when the source element belongs to a different project(): void
    {
        // GIVEN a target element in the project, and a source element in another project
        $repository = new InMemoryRelationRepository();
        $repository->registerProject(self::PROJECT_ID);
        $repository->registerMilestone(self::MILESTONE_ID, self::PROJECT_ID);
        $targetId = '00000000-0000-0000-0000-000000000010';
        $repository->registerElement($targetId, self::PROJECT_ID);

        $otherProjectId = '00000000-0000-0000-0000-000000000003';
        $foreignSourceId = '00000000-0000-0000-0000-000000000011';
        $repository->registerProject($otherProjectId);
        $repository->registerElement($foreignSourceId, $otherProjectId);

        $controller = new RelationController($repository);

        // WHEN creating a relation using that foreign element as the source
        $response = $controller->create(
            self::PROJECT_ID,
            new CreateRelationPayload(
                milestoneId: self::MILESTONE_ID,
                sourceElementId: $foreignSourceId,
                targetElementId: $targetId,
            ),
        );

        // THEN the request is rejected with a 400 and an error body
        self::assertSame(400, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }

    #[Test]
    public function it returns the given anchor in the created relation(): void
    {
        // GIVEN a controller backed by a repository with a project, milestone and two elements
        $repository = new InMemoryRelationRepository();
        $repository->registerProject(self::PROJECT_ID);
        $repository->registerMilestone(self::MILESTONE_ID, self::PROJECT_ID);
        $sourceId = '00000000-0000-0000-0000-000000000010';
        $targetId = '00000000-0000-0000-0000-000000000011';
        $repository->registerElement($sourceId, self::PROJECT_ID);
        $repository->registerElement($targetId, self::PROJECT_ID);
        $controller = new RelationController($repository);

        // WHEN creating a relation anchored from the source's left edge to the target's center
        $response = $controller->create(
            self::PROJECT_ID,
            new CreateRelationPayload(
                milestoneId: self::MILESTONE_ID,
                sourceElementId: $sourceId,
                targetElementId: $targetId,
                sourceHandle: 'left',
                targetHandle: 'center',
            ),
        );

        // THEN the response carries the given anchor
        self::assertSame(201, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertSame('left', $body['source_handle']);
        self::assertSame('center', $body['target_handle']);
    }
}

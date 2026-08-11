<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ElementController;
use App\Tests\Support\InMemoryElementRepository;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class ElementControllerTest extends TestCase
{
    private const string PROJECT_ID = '00000000-0000-0000-0000-000000000001';
    private const string MILESTONE_ID = '00000000-0000-0000-0000-000000000002';

    /**
     * @return iterable<string, array{0: array<string, mixed>}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing milestone_id' => [['kind' => 'system', 'name' => 'Booking']];
        yield 'missing kind' => [['milestone_id' => self::MILESTONE_ID, 'name' => 'Booking']];
        yield 'unsupported kind' => [['milestone_id' => self::MILESTONE_ID, 'kind' => 'person', 'name' => 'Client']];
        yield 'missing name' => [['milestone_id' => self::MILESTONE_ID, 'kind' => 'system']];
        yield 'empty name' => [['milestone_id' => self::MILESTONE_ID, 'kind' => 'system', 'name' => '']];
        yield 'non-boolean is_external' => [
            ['milestone_id' => self::MILESTONE_ID, 'kind' => 'system', 'name' => 'Booking', 'is_external' => 'yes'],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    #[Test]
    #[DataProvider('invalidPayloadProvider')]
    public function it rejects an invalid payload without creating an element(array $payload): void
    {
        // GIVEN a controller backed by an empty repository with a registered project and milestone
        $repository = new InMemoryElementRepository();
        $repository->registerProject(self::PROJECT_ID);
        $repository->registerMilestone(self::MILESTONE_ID, self::PROJECT_ID);
        $controller = new ElementController($repository);

        // WHEN creating an element with an invalid payload
        $response = $controller->create(self::PROJECT_ID, Request::create(
            '/api/projects/' . self::PROJECT_ID . '/elements',
            'POST',
            content: json_encode($payload, JSON_THROW_ON_ERROR),
        ));

        // THEN the request is rejected with a 400 and an error body
        self::assertSame(400, $response->getStatusCode());
        self::assertJson((string) $response->getContent());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);

        // AND no element was created
        self::assertSame([], $repository->findAllByProject(self::PROJECT_ID));
    }

    #[Test]
    public function it returns 404 when creating an element for an unknown project(): void
    {
        // GIVEN a controller backed by an empty repository
        $repository = new InMemoryElementRepository();
        $controller = new ElementController($repository);

        // WHEN creating an element for an unregistered project
        $response = $controller->create('00000000-0000-0000-0000-000000000000', Request::create(
            '/api/projects/00000000-0000-0000-0000-000000000000/elements',
            'POST',
            content: json_encode(['milestone_id' => self::MILESTONE_ID, 'kind' => 'system', 'name' => 'Booking'], JSON_THROW_ON_ERROR),
        ));

        // THEN the request is rejected with a 404 and an error body
        self::assertSame(404, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }

    #[Test]
    public function it returns 400 when the parent belongs to a different project(): void
    {
        // GIVEN a parent element in another project
        $repository = new InMemoryElementRepository();
        $repository->registerProject(self::PROJECT_ID);
        $repository->registerMilestone(self::MILESTONE_ID, self::PROJECT_ID);

        $otherProjectId = '00000000-0000-0000-0000-000000000003';
        $otherMilestoneId = '00000000-0000-0000-0000-000000000004';
        $repository->registerProject($otherProjectId);
        $repository->registerMilestone($otherMilestoneId, $otherProjectId);
        $foreignParent = $repository->create($otherProjectId, $otherMilestoneId, 'system', null, 'Payment', null, null, false);
        self::assertIsString($foreignParent['id']);

        $controller = new ElementController($repository);

        // WHEN creating an element under that foreign parent
        $response = $controller->create(self::PROJECT_ID, Request::create(
            '/api/projects/' . self::PROJECT_ID . '/elements',
            'POST',
            content: json_encode([
                'milestone_id' => self::MILESTONE_ID,
                'kind' => 'container',
                'name' => 'API',
                'parent_id' => $foreignParent['id'],
            ], JSON_THROW_ON_ERROR),
        ));

        // THEN the request is rejected with a 400 and an error body
        self::assertSame(400, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }
}

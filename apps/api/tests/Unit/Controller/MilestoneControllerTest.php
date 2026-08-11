<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MilestoneController;
use App\Tests\Support\InMemoryMilestoneRepository;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class MilestoneControllerTest extends TestCase
{
    /**
     * @return iterable<string, array{0: array<string, mixed>}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing label' => [['occurs_on' => '2026-03-01']];
        yield 'empty label' => [['label' => '', 'occurs_on' => '2026-03-01']];
        yield 'malformed occurs_on' => [['label' => 'Launch', 'occurs_on' => 'not-a-date']];
        yield 'occurs_on with time' => [['label' => 'Launch', 'occurs_on' => '2026-03-01T00:00:00']];
    }

    /**
     * @param array<string, mixed> $payload
     */
    #[Test]
    #[DataProvider('invalidPayloadProvider')]
    public function it rejects an invalid payload without creating a milestone(array $payload): void
    {
        // GIVEN a controller backed by an empty repository with a registered project
        $repository = new InMemoryMilestoneRepository();
        $repository->registerProject('00000000-0000-0000-0000-000000000001');
        $controller = new MilestoneController($repository);

        // WHEN creating a milestone with an invalid payload
        $response = $controller->create('00000000-0000-0000-0000-000000000001', Request::create(
            '/api/projects/00000000-0000-0000-0000-000000000001/milestones',
            'POST',
            content: json_encode($payload, JSON_THROW_ON_ERROR),
        ));

        // THEN the request is rejected with a 400 and an error body
        self::assertSame(400, $response->getStatusCode());
        self::assertJson((string) $response->getContent());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);

        // AND no milestone was created
        self::assertSame([], $repository->findAllByProject('00000000-0000-0000-0000-000000000001'));
    }

    #[Test]
    public function it returns 404 when creating a milestone for an unknown project(): void
    {
        // GIVEN a controller backed by an empty repository
        $repository = new InMemoryMilestoneRepository();
        $controller = new MilestoneController($repository);

        // WHEN creating a milestone for an unregistered project
        $response = $controller->create('00000000-0000-0000-0000-000000000000', Request::create(
            '/api/projects/00000000-0000-0000-0000-000000000000/milestones',
            'POST',
            content: json_encode(['label' => 'Launch'], JSON_THROW_ON_ERROR),
        ));

        // THEN the request is rejected with a 404 and an error body
        self::assertSame(404, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }
}

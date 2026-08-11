<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ProjectController;
use App\Tests\Support\InMemoryProjectRepository;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class ProjectControllerTest extends TestCase
{
    /**
     * @return iterable<string, array{0: array<string, mixed>}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing name' => [['slug' => 'a-b']];
        yield 'empty name' => [['name' => '', 'slug' => 'a-b']];
        yield 'missing slug' => [['name' => 'A B']];
        yield 'empty slug' => [['name' => 'A B', 'slug' => '']];
        yield 'uppercase slug' => [['name' => 'A B', 'slug' => 'A-B']];
        yield 'leading dash' => [['name' => 'A B', 'slug' => '-a-b']];
        yield 'trailing dash' => [['name' => 'A B', 'slug' => 'a-b-']];
        yield 'double dash' => [['name' => 'A B', 'slug' => 'a--b']];
        yield 'underscore' => [['name' => 'A B', 'slug' => 'a_b']];
        yield 'space in slug' => [['name' => 'A B', 'slug' => 'a b']];
    }

    /**
     * @param array<string, mixed> $payload
     */
    #[Test]
    #[DataProvider('invalidPayloadProvider')]
    public function it rejects an invalid payload without creating a project(array $payload): void
    {
        // GIVEN a controller backed by an empty repository
        $repository = new InMemoryProjectRepository();
        $controller = new ProjectController($repository);

        // WHEN creating a project with an invalid payload
        $response = $controller->create(Request::create(
            '/api/projects',
            'POST',
            content: json_encode($payload, JSON_THROW_ON_ERROR),
        ));

        // THEN the request is rejected with a 400 and an error body
        self::assertSame(400, $response->getStatusCode());
        self::assertJson((string) $response->getContent());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);

        // AND no project was created
        self::assertSame([], $repository->findAll());
    }

    #[Test]
    public function it returns 404 when deleting an unknown project(): void
    {
        // GIVEN a controller backed by an empty repository
        $repository = new InMemoryProjectRepository();
        $controller = new ProjectController($repository);

        // WHEN deleting an unknown id
        $response = $controller->delete('00000000-0000-0000-0000-000000000000');

        // THEN the request is rejected with a 404 and an error body
        self::assertSame(404, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }
}

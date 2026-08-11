<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\ProjectController;
use App\Dto\CreateProjectPayload;
use App\Tests\Support\InMemoryProjectRepository;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class ProjectControllerTest extends TestCase
{
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

    #[Test]
    public function it returns 409 when the slug is a duplicate(): void
    {
        // GIVEN a repository already containing a project with the same slug
        $repository = new InMemoryProjectRepository();
        $repository->create('Nanko', 'nanko');
        $controller = new ProjectController($repository);

        // WHEN creating another project with the same slug
        $response = $controller->create(new CreateProjectPayload(name: 'Nanko 2', slug: 'nanko'));

        // THEN the request is rejected with a 409 and an error body
        self::assertSame(409, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }
}

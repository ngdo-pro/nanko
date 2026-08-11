<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\DatabaseTestCase;
use PHPUnit\Framework\Attributes\Test;

final class ProjectControllerTest extends DatabaseTestCase
{
    #[Test]
    public function it returns an empty array when no project exists(): void
    {
        // GIVEN no project exists (guaranteed by DatabaseTestCase::setUp())

        // WHEN listing projects
        $this->client->request('GET', '/api/projects');

        // THEN the response is an empty array
        self::assertResponseIsSuccessful();
        self::assertSame([], json_decode((string) $this->client->getResponse()->getContent(), true));
    }

    #[Test]
    public function it returns the created project(): void
    {
        // GIVEN no project exists

        // WHEN creating a project
        $this->client->request('POST', '/api/projects', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'name' => 'Nanko',
            'slug' => 'nanko',
        ], JSON_THROW_ON_ERROR));

        // THEN the created project is returned with a generated id and timestamps
        self::assertResponseStatusCodeSame(201);
        $created = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($created);
        self::assertSame('Nanko', $created['name']);
        self::assertSame('nanko', $created['slug']);
        self::assertIsString($created['id']);
        self::assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $created['id'],
        );
        self::assertArrayHasKey('created_at', $created);
        self::assertArrayHasKey('updated_at', $created);
    }

    #[Test]
    public function a created project appears in the list(): void
    {
        // GIVEN a project was created
        $this->createProject('Nanko', 'nanko');

        // WHEN listing projects
        $this->client->request('GET', '/api/projects');

        // THEN the created project appears in the list
        self::assertResponseIsSuccessful();
        $list = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($list);
        self::assertCount(1, $list);
        self::assertIsArray($list[0]);
        self::assertSame('nanko', $list[0]['slug']);
    }

    #[Test]
    public function it returns 422 when the slug is invalid(): void
    {
        // GIVEN no project exists

        // WHEN creating a project with an invalid slug
        $this->client->request('POST', '/api/projects', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'name' => 'Nanko',
            'slug' => 'Not A Slug',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected
        self::assertResponseStatusCodeSame(422);
    }

    #[Test]
    public function it returns 409 when the slug is a duplicate(): void
    {
        // GIVEN a project already exists
        $this->createProject('Nanko', 'nanko');

        // WHEN creating another project with the same slug
        $this->client->request('POST', '/api/projects', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'name' => 'Nanko',
            'slug' => 'nanko',
        ], JSON_THROW_ON_ERROR));

        // THEN the request is rejected with a 409
        self::assertResponseStatusCodeSame(409);
        $body = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }

    #[Test]
    public function a duplicate slug does not create a second project(): void
    {
        // GIVEN a project already exists
        $this->createProject('Nanko', 'nanko');

        // WHEN attempting to create another project with the same slug
        $this->client->request('POST', '/api/projects', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'name' => 'Nanko',
            'slug' => 'nanko',
        ], JSON_THROW_ON_ERROR));

        // THEN the project list still contains a single entry
        $this->client->request('GET', '/api/projects');
        self::assertResponseIsSuccessful();
        $list = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($list);
        self::assertCount(1, $list);
    }

    #[Test]
    public function it deletes a project(): void
    {
        // GIVEN a project exists
        $id = $this->createProject('Nanko', 'nanko');

        // WHEN deleting it
        $this->client->request('DELETE', "/api/projects/{$id}");

        // THEN the response is a 204
        self::assertResponseStatusCodeSame(204);

        // AND the project no longer appears in the list
        $this->client->request('GET', '/api/projects');
        $list = json_decode((string) $this->client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertSame([], $list);
    }

    #[Test]
    public function it returns 404 when deleting an unknown project(): void
    {
        // GIVEN no project exists

        // WHEN deleting an unknown id
        $this->client->request('DELETE', '/api/projects/00000000-0000-0000-0000-000000000000');

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
}

<?php

declare(strict_types=1);

namespace App\Tests\Functional\WorkspaceManagement;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

final class WorkspaceEndpointsTest extends WebTestCase
{
    public function testListOrganisationsUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/organisations');

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }

    public function testListProjectsUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $orgId = (string) Uuid::v7();
        $client->request('GET', "/api/v1/organisations/{$orgId}/projects");

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }

    public function testCreateProjectUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $orgId = (string) Uuid::v7();
        $client->request(
            'POST',
            "/api/v1/organisations/{$orgId}/projects",
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['name' => 'Project', 'slug' => 'project']),
        );

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }
}

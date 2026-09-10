<?php

declare(strict_types=1);

namespace App\Tests\Functional\WorkspaceManagement;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

final class DocumentEndpointsTest extends WebTestCase
{
    public function testListDocumentsUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $projectId = (string) Uuid::v7();
        $client->request('GET', "/api/v1/projects/{$projectId}/documents");

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }

    public function testCreateDocumentUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $projectId = (string) Uuid::v7();
        $client->request(
            'POST',
            "/api/v1/projects/{$projectId}/documents",
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['name' => 'Doc', 'slug' => 'doc', 'layer' => 0]),
        );

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }

    public function testGetDocumentUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $docId = (string) Uuid::v7();
        $client->request('GET', "/api/v1/documents/{$docId}");

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }

    public function testUpdateDocumentUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $docId = (string) Uuid::v7();
        $client->request(
            'PUT',
            "/api/v1/documents/{$docId}",
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['sourceCode' => 'rectangle s1 label="S1"']),
        );

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }
}

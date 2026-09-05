<?php

declare(strict_types=1);

namespace App\Tests\Functional\AuthAndIdentity;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class MeEndpointTest extends WebTestCase
{
    public function testUnauthenticatedAccessReturns401(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/me');

        self::assertResponseStatusCodeSame(401);
        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);
        $data = json_decode($content, true);
        self::assertIsArray($data);
        self::assertSame('UNAUTHORIZED', $data['code'] ?? null);
    }
}

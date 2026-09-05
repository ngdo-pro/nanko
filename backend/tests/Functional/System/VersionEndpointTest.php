<?php

declare(strict_types=1);

namespace App\Tests\Functional\System;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class VersionEndpointTest extends WebTestCase
{
    public function testVersionEndpointReturnsSuccessWithExpectedFields(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/version');

        self::assertResponseIsSuccessful();
        self::assertResponseStatusCodeSame(200);

        $content = (string) $client->getResponse()->getContent();
        self::assertJson($content);

        $data = json_decode($content, true);
        self::assertIsArray($data);
        self::assertSame('ok', $data['status'] ?? null);
        self::assertNotEmpty($data['version'] ?? null);
        self::assertNotEmpty($data['commit'] ?? null);
        self::assertNotEmpty($data['environment'] ?? null);
    }
}

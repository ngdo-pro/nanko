<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class PingControllerTest extends WebTestCase
{
    #[Test]
    public function it returns status ok(): void
    {
        // GIVEN a client
        $client = static::createClient();

        // WHEN calling the ping endpoint
        $client->request('GET', '/api/ping');

        // THEN the response reports the service status
        self::assertResponseIsSuccessful();
        self::assertSame(
            ['status' => 'ok', 'service' => 'spike-symfony-api'],
            json_decode((string) $client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR),
        );
    }
}

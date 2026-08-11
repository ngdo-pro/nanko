<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CorsTest extends WebTestCase
{
    #[Test]
    public function a preflight request is allowed for a local origin(): void
    {
        // GIVEN a client
        $client = static::createClient();

        // WHEN sending a CORS preflight request from a local origin
        $client->request('OPTIONS', '/api/projects', server: [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);

        // THEN the origin is allowed
        $response = $client->getResponse();
        self::assertContains($response->getStatusCode(), [200, 204]);
        self::assertSame('http://localhost:5173', $response->headers->get('Access-Control-Allow-Origin'));
    }

    #[Test]
    public function an actual request from a local origin gets the cors header(): void
    {
        // GIVEN a client
        $client = static::createClient();

        // WHEN requesting from a local origin
        $client->request('GET', '/api/projects', server: ['HTTP_ORIGIN' => 'http://localhost:5173']);

        // THEN the response carries the matching CORS header
        self::assertResponseIsSuccessful();
        self::assertSame(
            'http://localhost:5173',
            $client->getResponse()->headers->get('Access-Control-Allow-Origin'),
        );
    }

    #[Test]
    public function a request from a disallowed origin gets no cors header(): void
    {
        // GIVEN a client
        $client = static::createClient();

        // WHEN requesting from an origin outside CORS_ALLOW_ORIGIN
        $client->request('GET', '/api/projects', server: ['HTTP_ORIGIN' => 'https://evil.example.com']);

        // THEN no CORS header is granted
        self::assertResponseIsSuccessful();
        self::assertNull($client->getResponse()->headers->get('Access-Control-Allow-Origin'));
    }
}

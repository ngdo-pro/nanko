<?php

declare(strict_types=1);

namespace App\Tests\Functional\OpenTelemetry;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class TraceContextTest extends WebTestCase
{
    public function testTraceparentHeaderIsExtractedAndPropagated(): void
    {
        $client = static::createClient();
        $traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
        $parentSpanId = '00f067aa0ba902b7';
        $incomingTraceparent = sprintf('00-%s-%s-01', $traceId, $parentSpanId);

        $client->request('GET', '/api/v1/version', [], [], [
            'HTTP_TRACEPARENT' => $incomingTraceparent,
        ]);

        self::assertResponseIsSuccessful();
        self::assertResponseStatusCodeSame(200);

        $responseTraceparent = (string) $client->getResponse()->headers->get('traceparent');
        self::assertNotEmpty($responseTraceparent, 'Response should contain a traceparent header');
        self::assertStringStartsWith('00-' . $traceId . '-', $responseTraceparent, 'Trace ID must be preserved across hops');
    }

    public function testCorsPreflightAllowsTraceparentAndTracestateHeaders(): void
    {
        $client = static::createClient();

        $client->request('OPTIONS', '/api/v1/version', [], [], [
            'HTTP_ORIGIN' => 'http://localhost:45173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type, authorization, traceparent, tracestate',
        ]);

        self::assertResponseIsSuccessful();

        $allowedHeaders = (string) $client->getResponse()->headers->get('access-control-allow-headers');
        self::assertStringContainsStringIgnoringCase('traceparent', $allowedHeaders);
        self::assertStringContainsStringIgnoringCase('tracestate', $allowedHeaders);
    }
}

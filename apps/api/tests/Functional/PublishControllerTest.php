<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Support\FakeHub;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Mercure\HubInterface;

final class PublishControllerTest extends WebTestCase
{
    #[Test]
    public function it returns published true and calls the hub(): void
    {
        // GIVEN a client
        $client = static::createClient();

        // WHEN calling the publish endpoint
        $client->request('POST', '/api/publish');

        // THEN the response confirms publication and the hub received the update
        self::assertResponseIsSuccessful();
        self::assertSame(
            ['published' => true],
            json_decode((string) $client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR),
        );

        /** @var FakeHub $hub */
        $hub = static::getContainer()->get(HubInterface::class);
        self::assertCount(1, $hub->published);
        self::assertSame(['spike/test'], $hub->published[0]->getTopics());
    }
}

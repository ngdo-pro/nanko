<?php

declare(strict_types=1);

namespace App\Tests\Functional\Adapter\Driver\Http\Controller\Org;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CreateTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $this->entityManager = $this->client->getContainer()->get(EntityManagerInterface::class);
        $this->entityManager->getConnection()->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->entityManager->getConnection()->rollBack();

        parent::tearDown();
    }

    public function testCreateOrgReturnsCreatedWithId(): void
    {
        $this->client->request(
            'POST',
            '/orgs',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['name' => 'Evaneos'], \JSON_THROW_ON_ERROR),
        );

        self::assertResponseStatusCodeSame(201);
        $payload = json_decode($this->client->getResponse()->getContent(), associative: true, flags: \JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('id', $payload);
    }
}

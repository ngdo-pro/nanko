<?php

declare(strict_types=1);

namespace App\Tests\Integration\AuthAndIdentity\Persistence;

use App\AuthAndIdentity\Adapter\Driven\Persistence\User\DoctrineRepository;
use App\AuthAndIdentity\Core\Domain\User\Id;
use App\AuthAndIdentity\Core\Domain\User\KeycloakId;
use App\AuthAndIdentity\Core\Domain\User\User;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class DoctrineRepositoryTest extends KernelTestCase
{
    private DoctrineRepository $repository;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        /** @var DoctrineRepository $repo */
        $repo = $container->get(DoctrineRepository::class);
        $this->repository = $repo;

        /** @var \Doctrine\DBAL\Connection $conn */
        $conn = $container->get('doctrine.dbal.default_connection');
        $conn->executeStatement('TRUNCATE TABLE app_user CASCADE');
    }

    public function testSaveAndFindUser(): void
    {
        $id = Id::generate();
        $keycloakUuid = (string) \Symfony\Component\Uid\Uuid::v7();
        $keycloakId = KeycloakId::fromString($keycloakUuid);

        $user = User::create($id, $keycloakId, 'integration@nanko.dev');
        $this->repository->save($user);

        $foundById = $this->repository->findById($id);
        self::assertNotNull($foundById);
        self::assertTrue($foundById->id()->equals($id));
        self::assertTrue($foundById->keycloakId()->equals($keycloakId));
        self::assertSame('integration@nanko.dev', $foundById->email());

        $foundByKeycloak = $this->repository->findByKeycloakId($keycloakId);
        self::assertNotNull($foundByKeycloak);
        self::assertTrue($foundByKeycloak->id()->equals($id));

        // Test update email
        $user->updateEmail('updated_integration@nanko.dev');
        $this->repository->save($user);

        $updatedUser = $this->repository->findById($id);
        self::assertNotNull($updatedUser);
        self::assertSame('updated_integration@nanko.dev', $updatedUser->email());
    }
}

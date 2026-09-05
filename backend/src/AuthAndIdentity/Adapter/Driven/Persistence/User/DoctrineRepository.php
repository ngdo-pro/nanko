<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Adapter\Driven\Persistence\User;

use App\AuthAndIdentity\Core\Domain\User\Id;
use App\AuthAndIdentity\Core\Domain\User\KeycloakId;
use App\AuthAndIdentity\Core\Domain\User\User;
use App\AuthAndIdentity\Core\Port\User\Repository;
use Doctrine\DBAL\Connection;

final readonly class DoctrineRepository implements Repository
{
    public function __construct(private Connection $connection) {}

    public function findById(Id $id): ?User
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, keycloak_id, email, created_at, updated_at FROM app_user WHERE id = :id',
            ['id' => $id->toString()]
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function findByKeycloakId(KeycloakId $keycloakId): ?User
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, keycloak_id, email, created_at, updated_at FROM app_user WHERE keycloak_id = :keycloak_id',
            ['keycloak_id' => $keycloakId->toString()]
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function save(User $user): void
    {
        $this->connection->executeStatement(
            'INSERT INTO app_user (id, keycloak_id, email, created_at, updated_at)
             VALUES (:id, :keycloak_id, :email, :created_at, :updated_at)
             ON CONFLICT (keycloak_id) DO UPDATE SET
                 email = EXCLUDED.email,
                 updated_at = EXCLUDED.updated_at',
            [
                'id' => $user->id->toString(),
                'keycloak_id' => $user->keycloakId->toString(),
                'email' => $user->email(),
                'created_at' => $user->createdAt->format(\DateTimeInterface::ATOM),
                'updated_at' => $user->updatedAt()->format(\DateTimeInterface::ATOM),
            ]
        );
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): User
    {
        $id = $row['id'];
        $keycloakId = $row['keycloak_id'];
        $email = $row['email'];
        $createdAt = $row['created_at'];
        $updatedAt = $row['updated_at'];

        assert(is_string($id));
        assert(is_string($keycloakId));
        assert(is_string($email));
        assert(is_string($createdAt));
        assert(is_string($updatedAt));

        return new User(
            id: Id::fromString($id),
            keycloakId: KeycloakId::fromString($keycloakId),
            email: $email,
            createdAt: new \DateTimeImmutable($createdAt),
            updatedAt: new \DateTimeImmutable($updatedAt),
        );
    }
}

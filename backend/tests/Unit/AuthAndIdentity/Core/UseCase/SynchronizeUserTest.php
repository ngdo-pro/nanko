<?php

declare(strict_types=1);

namespace App\Tests\Unit\AuthAndIdentity\Core\UseCase;

use App\AuthAndIdentity\Core\Domain\User\Id;
use App\AuthAndIdentity\Core\Domain\User\KeycloakId;
use App\AuthAndIdentity\Core\Domain\User\User;
use App\AuthAndIdentity\Core\Port\User\Repository;
use App\AuthAndIdentity\Core\UseCase\User\SynchronizeUser\Command;
use App\AuthAndIdentity\Core\UseCase\User\SynchronizeUser\Handler;
use PHPUnit\Framework\TestCase;

final class SynchronizeUserTest extends TestCase
{
    public function testCreatesNewUserWhenNotFound(): void
    {
        $savedUser = null;
        $repository = new class($savedUser) implements Repository {
            public function __construct(public ?User &$saved) {}

            public function findById(Id $id): ?User
            {
                return null;
            }

            public function findByKeycloakId(KeycloakId $keycloakId): ?User
            {
                return null;
            }

            public function save(User $user): void
            {
                $this->saved = $user;
            }
        };

        $handler = new Handler($repository);
        $keycloakUuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
        $user = $handler->handle(new Command(KeycloakId::fromString($keycloakUuid), 'new@nanko.dev'));

        self::assertNotNull($savedUser);
        self::assertSame($keycloakUuid, $user->keycloakId()->toString());
        self::assertSame('new@nanko.dev', $user->email());
    }

    public function testReturnsExistingUserAndUpdateEmailIfChanged(): void
    {
        $keycloakUuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
        $existing = User::create(
            Id::generate(),
            KeycloakId::fromString($keycloakUuid),
            'old@nanko.dev'
        );

        $savedUser = null;
        $repository = new class($existing, $savedUser) implements Repository {
            public function __construct(private readonly User $existing, public ?User &$saved) {}

            public function findById(Id $id): ?User
            {
                return $this->existing->id()->equals($id) ? $this->existing : null;
            }

            public function findByKeycloakId(KeycloakId $keycloakId): ?User
            {
                return $this->existing;
            }

            public function save(User $user): void
            {
                $this->saved = $user;
            }
        };

        $handler = new Handler($repository);
        $user = $handler->handle(new Command(KeycloakId::fromString($keycloakUuid), 'new@nanko.dev'));

        self::assertSame($existing->id()->toString(), $user->id()->toString());
        self::assertSame('new@nanko.dev', $user->email());
        self::assertNotNull($savedUser);
    }
}

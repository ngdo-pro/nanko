<?php

declare(strict_types=1);

namespace App\Tests\Unit\AuthAndIdentity\Core\Domain;

use App\AuthAndIdentity\Core\Domain\User\Id;
use App\AuthAndIdentity\Core\Domain\User\KeycloakId;
use App\AuthAndIdentity\Core\Domain\User\User;
use PHPUnit\Framework\TestCase;

final class UserTest extends TestCase
{
    public function testIdGenerationAndEquality(): void
    {
        $id1 = Id::generate();
        $id2 = Id::fromString($id1->toString());

        self::assertTrue($id1->equals($id2));
        self::assertNotEmpty($id1->toString());
    }

    public function testInvalidIdThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Id::fromString('invalid-uuid');
    }

    public function testKeycloakIdValidAndInvalid(): void
    {
        $validUuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
        $keycloakId = KeycloakId::fromString($validUuid);
        self::assertSame($validUuid, $keycloakId->toString());

        $this->expectException(\InvalidArgumentException::class);
        KeycloakId::fromString('not-a-uuid');
    }

    public function testUserCreationAndEmailUpdate(): void
    {
        $id = Id::generate();
        $keycloakId = KeycloakId::fromString('3fa85f64-5717-4562-b3fc-2c963f66afa6');
        $user = User::create($id, $keycloakId, 'user@nanko.dev');

        self::assertTrue($user->id()->equals($id));
        self::assertTrue($user->keycloakId()->equals($keycloakId));
        self::assertSame('user@nanko.dev', $user->email());
        self::assertInstanceOf(\DateTimeImmutable::class, $user->createdAt());
        self::assertInstanceOf(\DateTimeImmutable::class, $user->updatedAt());

        $user->updateEmail('updated@nanko.dev');
        self::assertSame('updated@nanko.dev', $user->email());
    }
}

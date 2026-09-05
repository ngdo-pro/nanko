<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Core\Domain\User;

final class User
{
    public function __construct(
        public readonly Id $id,
        public readonly KeycloakId $keycloakId,
        private string $email,
        public readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $updatedAt,
    ) {}

    public static function create(Id $id, KeycloakId $keycloakId, string $email): self
    {
        $now = new \DateTimeImmutable();

        return new self(
            id: $id,
            keycloakId: $keycloakId,
            email: $email,
            createdAt: $now,
            updatedAt: $now,
        );
    }

    public function id(): Id
    {
        return $this->id;
    }

    public function keycloakId(): KeycloakId
    {
        return $this->keycloakId;
    }

    public function email(): string
    {
        return $this->email;
    }

    public function createdAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function updatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function updateEmail(string $newEmail): void
    {
        if ($this->email !== $newEmail) {
            $this->email = $newEmail;
            $this->updatedAt = new \DateTimeImmutable();
        }
    }
}

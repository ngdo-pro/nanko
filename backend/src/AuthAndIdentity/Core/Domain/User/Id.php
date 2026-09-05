<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Core\Domain\User;

use Symfony\Component\Uid\Uuid;

final readonly class Id
{
    public function __construct(public Uuid $value) {}

    public static function generate(): self
    {
        return new self(Uuid::v7());
    }

    public static function fromString(string $uuid): self
    {
        return new self(Uuid::fromString($uuid));
    }

    public function toString(): string
    {
        return $this->value->toRfc4122();
    }

    public function equals(self $other): bool
    {
        return $this->value->equals($other->value);
    }
}

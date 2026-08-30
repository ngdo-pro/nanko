<?php

declare(strict_types=1);

namespace App\Core\Domain\Org;

use Symfony\Component\Uid\Uuid;

/**
 * Uses Symfony\Component\Uid\Uuid internally -- a deliberate, documented
 * exception to Core's zero-Symfony-dependency rule (see docs/adr/0011-*.md):
 * it is a plain value type, not a framework service, and symfony/uid is
 * already a direct composer dependency.
 */
final readonly class Id
{
    private function __construct(private Uuid $value)
    {
    }

    public static function generate(): self
    {
        return new self(Uuid::v7());
    }

    public static function fromString(string $value): self
    {
        return new self(Uuid::fromString($value));
    }

    public function equals(self $other): bool
    {
        return $this->value->equals($other->value);
    }

    public function toString(): string
    {
        return $this->value->toRfc4122();
    }

    /**
     * Doctrine's UnitOfWork::getIdHashByIdentifier() implode()s raw PHP
     * identifier values to build its identity-map key -- without this,
     * persisting or fetching an Org throws "Object of class Id could not
     * be converted to string".
     */
    public function __toString(): string
    {
        return $this->toString();
    }
}

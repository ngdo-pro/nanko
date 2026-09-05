<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Adapter\Driven\Persistence\User;

use App\AuthAndIdentity\Core\Domain\User\Id;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Type;

final class DoctrineId extends Type
{
    public const string NAME = 'user_id';

    /**
     * @param array<string, mixed> $column
     */
    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getGuidTypeDeclarationSQL($column);
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof Id) {
            return $value->toString();
        }

        if (is_string($value)) {
            return $value;
        }

        if (is_scalar($value) || $value instanceof \Stringable) {
            return (string) $value;
        }

        throw new \InvalidArgumentException('Expected Id, string or Stringable.');
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?Id
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof Id) {
            return $value;
        }

        assert(is_string($value));

        return Id::fromString($value);
    }

    public function getName(): string
    {
        return self::NAME;
    }
}

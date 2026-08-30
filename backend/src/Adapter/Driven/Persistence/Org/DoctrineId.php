<?php

declare(strict_types=1);

namespace App\Adapter\Driven\Persistence\Org;

use App\Core\Domain\Org\Id;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Type;

/**
 * DBAL type for Org's identity value object, so a repository stores and
 * hydrates an Org's Id directly rather than a bare Uuid/string -- the
 * strong typing that keeps an Org's id from being passed where a
 * Project's id is expected. Targets Postgres's native uuid column
 * directly (per docs/adr/0007-postgres-only-for-mvp.md, no other
 * platform to support).
 */
final class DoctrineId extends Type
{
    public const string NAME = 'org_id';

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getGuidTypeDeclarationSQL($column);
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?Id
    {
        if ($value === null || $value instanceof Id) {
            return $value;
        }

        return Id::fromString($value);
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        if ($value === null) {
            return null;
        }

        \assert($value instanceof Id);

        return $value->toString();
    }

    public function requiresSQLCommentHint(AbstractPlatform $platform): bool
    {
        return true;
    }
}

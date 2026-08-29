<?php

declare(strict_types=1);

namespace App\Doctrine\Type;

use App\ValueObject\Satisfies;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;
use Doctrine\DBAL\Types\JsonType;

/**
 * @phpstan-type SatisfiesList list<Satisfies>
 */
final class SatisfiesListType extends JsonType
{
    public const NAME = 'satisfies_list';

    /**
     * @return list<Satisfies>|null
     */
    public function convertToPHPValue($value, AbstractPlatform $platform): ?array
    {
        $decoded = parent::convertToPHPValue($value, $platform);

        if (null === $decoded) {
            return null;
        }

        if (!\is_array($decoded)) {
            throw ConversionException::conversionFailed((string) $value, self::NAME);
        }

        return array_map(Satisfies::fromArray(...), $decoded);
    }

    public function convertToDatabaseValue($value, AbstractPlatform $platform): ?string
    {
        if (\is_array($value)) {
            $value = array_map(
                static fn ($item) => $item instanceof Satisfies ? $item->toArray() : $item,
                $value,
            );
        }

        return parent::convertToDatabaseValue($value, $platform);
    }

    public function getName(): string
    {
        return self::NAME;
    }
}

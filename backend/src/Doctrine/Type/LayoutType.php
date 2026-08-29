<?php

declare(strict_types=1);

namespace App\Doctrine\Type;

use App\ValueObject\Layout;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;
use Doctrine\DBAL\Types\JsonType;

final class LayoutType extends JsonType
{
    public const NAME = 'layout';

    public function convertToPHPValue($value, AbstractPlatform $platform): ?Layout
    {
        $decoded = parent::convertToPHPValue($value, $platform);

        if (null === $decoded) {
            return null;
        }

        if (!\is_array($decoded)) {
            throw ConversionException::conversionFailed((string) $value, self::NAME);
        }

        return Layout::fromArray($decoded);
    }

    public function convertToDatabaseValue($value, AbstractPlatform $platform): ?string
    {
        if ($value instanceof Layout) {
            $value = $value->toArray();
        }

        return parent::convertToDatabaseValue($value, $platform);
    }

    public function getName(): string
    {
        return self::NAME;
    }
}

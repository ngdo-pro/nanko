<?php

declare(strict_types=1);

namespace App\Doctrine\Type;

use App\ValueObject\DocumentContent;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;
use Doctrine\DBAL\Types\JsonType;

final class DocumentContentType extends JsonType
{
    public const NAME = 'document_content';

    public function convertToPHPValue($value, AbstractPlatform $platform): ?DocumentContent
    {
        $decoded = parent::convertToPHPValue($value, $platform);

        if (null === $decoded) {
            return null;
        }

        if (!\is_array($decoded)) {
            throw ConversionException::conversionFailed((string) $value, self::NAME);
        }

        return DocumentContent::fromArray($decoded);
    }

    public function convertToDatabaseValue($value, AbstractPlatform $platform): ?string
    {
        if ($value instanceof DocumentContent) {
            $value = $value->toArray();
        }

        return parent::convertToDatabaseValue($value, $platform);
    }

    public function getName(): string
    {
        return self::NAME;
    }
}

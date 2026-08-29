<?php

declare(strict_types=1);

namespace App\Validator;

use App\Exception\InvalidDocumentContentException;
use App\ValueObject\DocumentContent;

/**
 * Application-level validation of a Document's content on the write path —
 * mandatory/unique Shape ids, Connectors referencing known Shapes. Enforced
 * here rather than via database constraints/triggers (ADR-0007's "no
 * premature infrastructure" spirit applies just as well to Postgres triggers).
 */
final class DocumentContentValidator
{
    public function validate(DocumentContent $content): void
    {
        $shapeIds = [];

        foreach ($content->shapes as $shape) {
            if ('' === $shape->id) {
                throw new InvalidDocumentContentException('Every Shape must have a non-empty id.');
            }

            if (isset($shapeIds[$shape->id])) {
                throw new InvalidDocumentContentException(sprintf('Duplicate Shape id "%s".', $shape->id));
            }

            $shapeIds[$shape->id] = true;
        }

        foreach ($content->connectors as $connector) {
            if ('' === $connector->id) {
                throw new InvalidDocumentContentException('Every Connector must have a non-empty id.');
            }

            foreach (['fromShapeId' => $connector->fromShapeId, 'toShapeId' => $connector->toShapeId] as $field => $shapeId) {
                if (!isset($shapeIds[$shapeId])) {
                    throw new InvalidDocumentContentException(sprintf(
                        'Connector "%s" references unknown Shape "%s" via %s.',
                        $connector->id,
                        $shapeId,
                        $field,
                    ));
                }
            }
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Unit\Validator;

use App\Enum\ShapeType;
use App\Exception\InvalidDocumentContentException;
use App\ValueObject\Connector;
use App\ValueObject\DocumentContent;
use App\ValueObject\Shape;
use App\Validator\DocumentContentValidator;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class DocumentContentValidatorTest extends TestCase
{
    private DocumentContentValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new DocumentContentValidator();
    }

    #[Test]
    public function it_accepts_shapes_with_unique_ids_and_connectors_referencing_known_shapes(): void
    {
        $content = new DocumentContent(
            shapes: [
                new Shape(id: 'a', type: ShapeType::Rectangle),
                new Shape(id: 'b', type: ShapeType::Circle),
            ],
            connectors: [
                new Connector(id: 'c1', fromShapeId: 'a', toShapeId: 'b'),
            ],
        );

        $this->validator->validate($content);
        $this->addToAssertionCount(1); // no exception thrown
    }

    #[Test]
    public function it_rejects_duplicate_shape_ids(): void
    {
        $content = new DocumentContent(
            shapes: [
                new Shape(id: 'a', type: ShapeType::Rectangle),
                new Shape(id: 'a', type: ShapeType::Circle),
            ],
        );

        $this->expectException(InvalidDocumentContentException::class);
        $this->expectExceptionMessageMatches('/Duplicate Shape id "a"/');
        $this->validator->validate($content);
    }

    #[Test]
    public function it_rejects_a_connector_referencing_an_unknown_shape(): void
    {
        $content = new DocumentContent(
            shapes: [new Shape(id: 'a', type: ShapeType::Rectangle)],
            connectors: [new Connector(id: 'c1', fromShapeId: 'a', toShapeId: 'missing')],
        );

        $this->expectException(InvalidDocumentContentException::class);
        $this->expectExceptionMessageMatches('/references unknown Shape "missing"/');
        $this->validator->validate($content);
    }
}

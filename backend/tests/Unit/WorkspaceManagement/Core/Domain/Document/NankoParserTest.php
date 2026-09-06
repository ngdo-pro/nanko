<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\Domain\Document;

use App\WorkspaceManagement\Core\Domain\Document\Parser\InvalidNankoSyntaxException;
use App\WorkspaceManagement\Core\Domain\Document\Parser\NankoParser;
use PHPUnit\Framework\TestCase;

final class NankoParserTest extends TestCase
{
    public function testParsesNominalNankoDocument(): void
    {
        $code = <<<'NANKO'
@id architecture-ecommerce
@layer 0

# Composants d'infrastructure
rectangle front "Storefront Next.js"
circle api "Catalogue API"
text notes "Note d'architecture"

// Relations logiques
front -> api "fetch products"

!LAYOUT
front: x=100, y=150
api: x=400, y=150
!END
NANKO;

        $ast = NankoParser::parse($code);

        self::assertCount(3, $ast->shapes);
        self::assertSame('front', $ast->shapes[0]->id);
        self::assertSame('rectangle', $ast->shapes[0]->type);
        self::assertSame('Storefront Next.js', $ast->shapes[0]->label);

        self::assertSame('api', $ast->shapes[1]->id);
        self::assertSame('circle', $ast->shapes[1]->type);
        self::assertSame('Catalogue API', $ast->shapes[1]->label);

        self::assertSame('notes', $ast->shapes[2]->id);
        self::assertSame('text', $ast->shapes[2]->type);
        self::assertSame('Note d\'architecture', $ast->shapes[2]->label);

        self::assertCount(1, $ast->connectors);
        self::assertSame('front', $ast->connectors[0]->source);
        self::assertSame('api', $ast->connectors[0]->target);
        self::assertSame('fetch products', $ast->connectors[0]->label);

        self::assertArrayHasKey('front', $ast->layout);
        self::assertSame(['x' => 100, 'y' => 150], $ast->layout['front']);
        self::assertArrayHasKey('api', $ast->layout);
        self::assertSame(['x' => 400, 'y' => 150], $ast->layout['api']);
    }

    public function testRejectsConnectorWithUnknownTarget(): void
    {
        $code = <<<'NANKO'
rectangle front "Storefront"
front -> unknown_service "call"
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage('Le connecteur référence une Shape cible non déclarée : "unknown_service".');

        NankoParser::parse($code);
    }

    public function testRejectsConnectorWithUnknownSource(): void
    {
        $code = <<<'NANKO'
circle api "API"
unknown_front -> api
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage('Le connecteur référence une Shape source non déclarée : "unknown_front".');

        NankoParser::parse($code);
    }

    public function testRejectsDuplicateShapeId(): void
    {
        $code = <<<'NANKO'
rectangle app "First"
circle app "Duplicate"
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage('Une Shape avec l\'identifiant "app" est déjà déclarée.');

        NankoParser::parse($code);
    }

    public function testRejectsUnrecognizedInstruction(): void
    {
        $code = <<<'NANKO'
invalid syntax line here
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage('Instruction non reconnue : "invalid syntax line here".');

        NankoParser::parse($code);
    }

    public function testToleratesEmptyLinesAndCommentsOnly(): void
    {
        $code = <<<'NANKO'

# Just a comment
// Another comment

NANKO;

        $ast = NankoParser::parse($code);

        self::assertCount(0, $ast->shapes);
        self::assertCount(0, $ast->connectors);
        self::assertCount(0, $ast->layout);
    }
}

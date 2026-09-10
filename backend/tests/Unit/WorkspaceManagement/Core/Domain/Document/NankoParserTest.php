<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\Domain\Document;

use App\WorkspaceManagement\Core\Domain\Document\Parser\InvalidNankoSyntaxException;
use App\WorkspaceManagement\Core\Domain\Document\Parser\NankoParser;
use PHPUnit\Framework\TestCase;

final class NankoParserTest extends TestCase
{
    public function testParsesNominalNankoDocumentWithDslVersionAndAttributes(): void
    {
        $code = <<<'NANKO'
@id architecture-ecommerce
@dsl-version 1
@layer 0

# Composants d'infrastructure
rectangle front label="Storefront Next.js" desc="Frontend web public"
circle api label="Catalogue API" desc="API REST Symfony"
text notes label="Note d'architecture"

// Relations logiques
front -> api label="fetch products" desc="Requêtes HTTPS via CDN"

!LAYOUT
front: x=100, y=150
api: x=400, y=150
!END
NANKO;

        $ast = NankoParser::parse($code);

        self::assertSame(1, $ast->dslVersion);
        self::assertCount(3, $ast->shapes);

        self::assertSame('front', $ast->shapes[0]->id);
        self::assertSame('rectangle', $ast->shapes[0]->type);
        self::assertSame('Storefront Next.js', $ast->shapes[0]->label);
        self::assertSame('Frontend web public', $ast->shapes[0]->desc);

        self::assertSame('api', $ast->shapes[1]->id);
        self::assertSame('circle', $ast->shapes[1]->type);
        self::assertSame('Catalogue API', $ast->shapes[1]->label);
        self::assertSame('API REST Symfony', $ast->shapes[1]->desc);

        self::assertSame('notes', $ast->shapes[2]->id);
        self::assertSame('text', $ast->shapes[2]->type);
        self::assertSame('Note d\'architecture', $ast->shapes[2]->label);
        self::assertNull($ast->shapes[2]->desc);

        self::assertCount(1, $ast->connectors);
        self::assertSame('front', $ast->connectors[0]->source);
        self::assertSame('api', $ast->connectors[0]->target);
        self::assertSame('fetch products', $ast->connectors[0]->label);
        self::assertSame('Requêtes HTTPS via CDN', $ast->connectors[0]->desc);

        self::assertArrayHasKey('front', $ast->layout);
        self::assertSame(['x' => 100, 'y' => 150], $ast->layout['front']);
        self::assertArrayHasKey('api', $ast->layout);
        self::assertSame(['x' => 400, 'y' => 150], $ast->layout['api']);

        $array = $ast->toArray();
        self::assertSame(1, $array['dslVersion']);
        self::assertSame('Storefront Next.js', $array['shapes'][0]['label']);
        self::assertSame('Frontend web public', $array['shapes'][0]['desc']);
    }

    public function testDefaultsToDslVersion1WhenDirectiveOmitted(): void
    {
        $code = <<<'NANKO'
rectangle front label="Storefront"
NANKO;

        $ast = NankoParser::parse($code);
        self::assertSame(1, $ast->dslVersion);
    }

    public function testRejectsUnsupportedDslVersion(): void
    {
        $code = <<<'NANKO'
@dsl-version 99
rectangle front label="Storefront"
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage("Version de DSL non supportée : '99'. Seule la version 1 est actuellement supportée.");

        NankoParser::parse($code);
    }

    public function testParsesAttributesInAnyOrder(): void
    {
        $code = <<<'NANKO'
rectangle compute desc="Worker asynchrone" label="Compute Worker"
rectangle queue label="RabbitMQ"
compute -> queue desc="AMQP 0-9-1" label="publish"
NANKO;

        $ast = NankoParser::parse($code);
        self::assertSame('Compute Worker', $ast->shapes[0]->label);
        self::assertSame('Worker asynchrone', $ast->shapes[0]->desc);

        self::assertSame('publish', $ast->connectors[0]->label);
        self::assertSame('AMQP 0-9-1', $ast->connectors[0]->desc);
    }

    public function testSupportsEscapedDoubleQuotesInAttributeValues(): void
    {
        $code = <<<'NANKO'
rectangle srv label="Serveur" desc="Module de \"monitoring\" avancé"
NANKO;

        $ast = NankoParser::parse($code);
        self::assertSame('Module de "monitoring" avancé', $ast->shapes[0]->desc);
    }

    public function testRejectsAttributeWithoutDoubleQuotes(): void
    {
        $code = <<<'NANKO'
rectangle srv label=MonLabel
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage("La valeur de l'attribut 'label' doit être entourée de guillemets doubles.");

        NankoParser::parse($code);
    }

    public function testRejectsShapeWithoutMandatoryLabel(): void
    {
        $code = <<<'NANKO'
rectangle app desc="Description seule"
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage("L'attribut 'label' est obligatoire pour la shape 'app'.");

        NankoParser::parse($code);
    }

    public function testRejectsConnectorWithDescWithoutLabel(): void
    {
        $code = <<<'NANKO'
rectangle a label="A"
rectangle b label="B"
a -> b desc="Flux sans label"
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage("Un connecteur ne peut pas déclarer de description ('desc') sans libellé ('label').");

        NankoParser::parse($code);
    }

    public function testAcceptsConnectorWithoutAttributesAndWithLabelOnly(): void
    {
        $code = <<<'NANKO'
rectangle a label="A"
rectangle b label="B"
a -> b
a -> b label="HTTP"
NANKO;

        $ast = NankoParser::parse($code);
        self::assertCount(2, $ast->connectors);
        self::assertNull($ast->connectors[0]->label);
        self::assertNull($ast->connectors[0]->desc);
        self::assertSame('HTTP', $ast->connectors[1]->label);
        self::assertNull($ast->connectors[1]->desc);
    }

    public function testRejectsConnectorWithUnknownTarget(): void
    {
        $code = <<<'NANKO'
rectangle front label="Storefront"
front -> unknown_service label="call"
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage('Le connecteur référence une Shape cible non déclarée : "unknown_service".');

        NankoParser::parse($code);
    }

    public function testRejectsConnectorWithUnknownSource(): void
    {
        $code = <<<'NANKO'
circle api label="API"
unknown_front -> api
NANKO;

        $this->expectException(InvalidNankoSyntaxException::class);
        $this->expectExceptionMessage('Le connecteur référence une Shape source non déclarée : "unknown_front".');

        NankoParser::parse($code);
    }

    public function testRejectsDuplicateShapeId(): void
    {
        $code = <<<'NANKO'
rectangle app label="First"
circle app label="Duplicate"
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

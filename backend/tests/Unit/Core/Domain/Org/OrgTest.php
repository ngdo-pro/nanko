<?php

declare(strict_types=1);

namespace App\Tests\Unit\Core\Domain\Org;

use App\Core\Domain\Org\Id;
use App\Core\Domain\Org\Org;
use PHPUnit\Framework\TestCase;

final class OrgTest extends TestCase
{
    public function testCreateSetsNameAndId(): void
    {
        $id = Id::generate();
        $org = Org::create($id, 'Evaneos');

        self::assertTrue($id->equals($org->id()));
        self::assertSame('Evaneos', $org->name());
    }

    public function testRenameTrimsWhitespace(): void
    {
        $org = Org::create(Id::generate(), 'Evaneos');

        $org->rename('  Nanko  ');

        self::assertSame('Nanko', $org->name());
    }

    public function testRenameRejectsEmptyName(): void
    {
        $org = Org::create(Id::generate(), 'Evaneos');

        $this->expectException(\InvalidArgumentException::class);

        $org->rename('   ');
    }

    public function testCreateRejectsEmptyName(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        Org::create(Id::generate(), '');
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\Domain\Organisation;

use App\WorkspaceManagement\Core\Domain\Organisation\Id;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use PHPUnit\Framework\TestCase;

final class OrganisationTest extends TestCase
{
    public function testCreateOrganisation(): void
    {
        $id = Id::generate();
        $org = Organisation::create($id, 'Acme Corp', 'acme-corp', false);

        self::assertTrue($org->id()->equals($id));
        self::assertSame('Acme Corp', $org->name());
        self::assertSame('acme-corp', $org->slug());
        self::assertFalse($org->isPersonal());
        self::assertInstanceOf(\DateTimeImmutable::class, $org->createdAt());
        self::assertInstanceOf(\DateTimeImmutable::class, $org->updatedAt());
    }

    public function testCreatePersonalOrganisation(): void
    {
        $id = Id::generate();
        $org = Organisation::create($id, 'Espace personnel', 'personal-12345678', true);

        self::assertTrue($org->isPersonal());
    }

    public function testRenameOrganisation(): void
    {
        $id = Id::generate();
        $org = Organisation::create($id, 'Old Name', 'old-name');
        $org->rename('New Name');

        self::assertSame('New Name', $org->name());
    }
}

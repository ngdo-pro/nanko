<?php

declare(strict_types=1);

namespace App\Tests\Unit\Core\UseCase\Org\CreateOrg;

use App\Core\UseCase\Org\CreateOrg\Command;
use App\Core\UseCase\Org\CreateOrg\Handler;
use App\Tests\Double\Org\InMemoryOrgRepository;
use PHPUnit\Framework\TestCase;

final class HandlerTest extends TestCase
{
    public function testCreatesAndPersistsAnOrg(): void
    {
        $orgs = new InMemoryOrgRepository();
        $handler = new Handler($orgs);

        $id = ($handler)(new Command('Evaneos'));

        self::assertSame('Evaneos', $orgs->ofId($id)?->name());
    }
}

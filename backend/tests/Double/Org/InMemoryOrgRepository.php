<?php

declare(strict_types=1);

namespace App\Tests\Double\Org;

use App\Core\Domain\Org\Id;
use App\Core\Domain\Org\Org;
use App\Core\Port\Org\OrgRepository;

final class InMemoryOrgRepository implements OrgRepository
{
    /** @var array<string, Org> */
    private array $orgs = [];

    public function save(Org $org): void
    {
        $this->orgs[$org->id()->toString()] = $org;
    }

    public function ofId(Id $id): ?Org
    {
        return $this->orgs[$id->toString()] ?? null;
    }
}

<?php

declare(strict_types=1);

namespace App\Core\Port\Org;

use App\Core\Domain\Org\Id;
use App\Core\Domain\Org\Org;

interface OrgRepository
{
    public function save(Org $org): void;

    public function ofId(Id $id): ?Org;
}

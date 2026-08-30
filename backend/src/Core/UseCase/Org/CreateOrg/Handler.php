<?php

declare(strict_types=1);

namespace App\Core\UseCase\Org\CreateOrg;

use App\Core\Domain\Org\Id;
use App\Core\Domain\Org\Org;
use App\Core\Port\Org\OrgRepository;

final class Handler
{
    public function __construct(private readonly OrgRepository $orgs)
    {
    }

    public function __invoke(Command $command): Id
    {
        $org = Org::create(Id::generate(), $command->name);
        $this->orgs->save($org);

        return $org->id();
    }
}

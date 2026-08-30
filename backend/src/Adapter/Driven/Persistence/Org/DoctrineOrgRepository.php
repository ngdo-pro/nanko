<?php

declare(strict_types=1);

namespace App\Adapter\Driven\Persistence\Org;

use App\Core\Domain\Org\Id;
use App\Core\Domain\Org\Org;
use App\Core\Port\Org\OrgRepository;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineOrgRepository implements OrgRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function save(Org $org): void
    {
        $this->entityManager->persist($org);
        $this->entityManager->flush();
    }

    public function ofId(Id $id): ?Org
    {
        return $this->entityManager->find(Org::class, $id);
    }
}

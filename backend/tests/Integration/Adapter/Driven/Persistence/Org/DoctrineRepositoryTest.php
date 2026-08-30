<?php

declare(strict_types=1);

namespace App\Tests\Integration\Adapter\Driven\Persistence\Org;

use App\Adapter\Driven\Persistence\Org\DoctrineOrgRepository;
use App\Core\Domain\Org\Id;
use App\Core\Domain\Org\Org;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class DoctrineRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private DoctrineOrgRepository $repository;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $this->entityManager->getConnection()->beginTransaction();

        $this->repository = new DoctrineOrgRepository($this->entityManager);
    }

    protected function tearDown(): void
    {
        $this->entityManager->getConnection()->rollBack();

        parent::tearDown();
    }

    public function testSaveThenOfIdRoundTripsAnOrg(): void
    {
        $org = Org::create(Id::generate(), 'Evaneos');

        $this->repository->save($org);
        $this->entityManager->clear();

        $found = $this->repository->ofId($org->id());

        self::assertNotNull($found);
        self::assertSame('Evaneos', $found->name());
    }

    public function testOfIdReturnsNullWhenNotFound(): void
    {
        self::assertNull($this->repository->ofId(Id::generate()));
    }
}

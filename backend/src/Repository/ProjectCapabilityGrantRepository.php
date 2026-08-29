<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Project;
use App\Entity\ProjectCapabilityGrant;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ProjectCapabilityGrant>
 */
final class ProjectCapabilityGrantRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProjectCapabilityGrant::class);
    }

    /**
     * @return ProjectCapabilityGrant[]
     */
    public function findForUserInProject(Project $project, User $user): array
    {
        return $this->createQueryBuilder('grant')
            ->andWhere('grant.project = :project')
            ->andWhere('grant.user = :user')
            ->setParameter('project', $project)
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}

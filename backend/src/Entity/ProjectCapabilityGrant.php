<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use App\Enum\Capability;
use App\Repository\ProjectCapabilityGrantRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProjectCapabilityGrantRepository::class)]
#[ORM\Table(name: 'project_capability_grant')]
#[ORM\UniqueConstraint(name: 'uniq_project_capability_grant', columns: ['project_id', 'user_id', 'capability'])]
class ProjectCapabilityGrant
{
    use HasUuidId;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Project::class, inversedBy: 'capabilityGrants')]
        #[ORM\JoinColumn(nullable: false)]
        private Project $project,
        #[ORM\ManyToOne(targetEntity: User::class)]
        #[ORM\JoinColumn(nullable: false)]
        private User $user,
        #[ORM\Column(type: 'string', enumType: Capability::class)]
        private Capability $capability,
    ) {
    }

    public function getProject(): Project
    {
        return $this->project;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getCapability(): Capability
    {
        return $this->capability;
    }
}

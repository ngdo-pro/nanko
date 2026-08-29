<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'org_membership')]
#[ORM\UniqueConstraint(name: 'uniq_org_membership_org_user', columns: ['org_id', 'user_id'])]
class OrgMembership
{
    use HasUuidId;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $joinedAt;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Org::class, inversedBy: 'memberships')]
        #[ORM\JoinColumn(nullable: false)]
        private Org $org,
        #[ORM\ManyToOne(targetEntity: User::class)]
        #[ORM\JoinColumn(nullable: false)]
        private User $user,
    ) {
        $this->joinedAt = new \DateTimeImmutable();
    }

    public function getOrg(): Org
    {
        return $this->org;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getJoinedAt(): \DateTimeImmutable
    {
        return $this->joinedAt;
    }
}

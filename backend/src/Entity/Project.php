<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'project')]
class Project
{
    use HasUuidId;

    /** @var Collection<int, Document> */
    #[ORM\OneToMany(targetEntity: Document::class, mappedBy: 'project')]
    private Collection $documents;

    /** @var Collection<int, ProjectCapabilityGrant> */
    #[ORM\OneToMany(targetEntity: ProjectCapabilityGrant::class, mappedBy: 'project')]
    private Collection $capabilityGrants;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Org::class, inversedBy: 'projects')]
        #[ORM\JoinColumn(nullable: false)]
        private Org $org,
        #[ORM\Column(type: 'string')]
        private string $name,
        #[ORM\Column(type: 'string')]
        private string $slug,
    ) {
        $this->documents = new ArrayCollection();
        $this->capabilityGrants = new ArrayCollection();
    }

    public function getOrg(): Org
    {
        return $this->org;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }
}

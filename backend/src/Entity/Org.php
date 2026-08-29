<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use App\Enum\Capability;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'org')]
class Org
{
    use HasUuidId;

    /** @var array<int, string> */
    #[ORM\Column(type: Types::JSON)]
    private array $defaultCapabilities = [];

    /** @var Collection<int, Project> */
    #[ORM\OneToMany(targetEntity: Project::class, mappedBy: 'org')]
    private Collection $projects;

    /** @var Collection<int, OrgMembership> */
    #[ORM\OneToMany(targetEntity: OrgMembership::class, mappedBy: 'org')]
    private Collection $memberships;

    public function __construct(
        #[ORM\Column(type: 'string')]
        private string $name,
        #[ORM\Column(type: 'string', unique: true)]
        private string $slug,
    ) {
        $this->projects = new ArrayCollection();
        $this->memberships = new ArrayCollection();
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    /**
     * @return Capability[]
     */
    public function getDefaultCapabilities(): array
    {
        return array_map(
            static fn (string $value): Capability => Capability::from($value),
            $this->defaultCapabilities,
        );
    }

    /**
     * @param Capability[] $capabilities
     */
    public function setDefaultCapabilities(array $capabilities): void
    {
        $this->defaultCapabilities = array_values(array_unique(
            array_map(static fn (Capability $capability): string => $capability->value, $capabilities),
        ));
    }
}

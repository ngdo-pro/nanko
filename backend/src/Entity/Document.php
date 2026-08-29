<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use App\Enum\DocumentType;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'document')]
class Document
{
    use HasUuidId;

    #[ORM\ManyToOne(targetEntity: Version::class)]
    #[ORM\JoinColumn(name: 'current_version_id', nullable: true, onDelete: 'SET NULL')]
    private ?Version $currentVersion = null;

    #[ORM\OneToOne(targetEntity: Draft::class, mappedBy: 'document', cascade: ['persist', 'remove'])]
    private ?Draft $draft = null;

    /** @var Collection<int, Version> */
    #[ORM\OneToMany(targetEntity: Version::class, mappedBy: 'document')]
    private Collection $versions;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Project::class, inversedBy: 'documents')]
        #[ORM\JoinColumn(nullable: false)]
        private Project $project,
        #[ORM\Column(type: 'string')]
        private string $layer,
        #[ORM\Column(type: 'string', enumType: DocumentType::class)]
        private DocumentType $type,
    ) {
        $this->versions = new ArrayCollection();
    }

    public function getProject(): Project
    {
        return $this->project;
    }

    public function getLayer(): string
    {
        return $this->layer;
    }

    public function setLayer(string $layer): void
    {
        $this->layer = $layer;
    }

    public function getType(): DocumentType
    {
        return $this->type;
    }

    public function getDraft(): ?Draft
    {
        return $this->draft;
    }

    /**
     * @return Collection<int, Version>
     */
    public function getVersions(): Collection
    {
        return $this->versions;
    }

    public function getCurrentVersion(): ?Version
    {
        return $this->currentVersion;
    }

    /**
     * Manually designates the Version that is authoritative for cross-Layer
     * navigation — never derived automatically from a `satisfies` range (ADR-0002).
     */
    public function setCurrentVersion(Version $version): void
    {
        if ($version->getDocument() !== $this) {
            throw new \InvalidArgumentException('Cannot set a Version belonging to another Document as current.');
        }

        $this->currentVersion = $version;
    }
}

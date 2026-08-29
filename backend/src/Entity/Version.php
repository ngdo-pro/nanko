<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use App\Exception\VersionIsImmutableException;
use App\ValueObject\DocumentContent;
use App\ValueObject\Layout;
use App\ValueObject\Satisfies;
use Doctrine\ORM\Mapping as ORM;

/**
 * An immutable, published snapshot of a Document — content and Layout together
 * (ADR-0003). Never mutated after publish; see {@see self::rejectMutation()}.
 */
#[ORM\Entity]
#[ORM\Table(name: 'version')]
#[ORM\UniqueConstraint(name: 'uniq_version_document_semver', columns: ['document_id', 'semver'])]
#[ORM\Index(name: 'idx_version_document_timeline', columns: ['document_id', 'major', 'minor', 'patch'])]
#[ORM\HasLifecycleCallbacks]
class Version
{
    use HasUuidId;

    #[ORM\Column(type: 'smallint')]
    private readonly int $major;

    #[ORM\Column(type: 'smallint')]
    private readonly int $minor;

    #[ORM\Column(type: 'smallint')]
    private readonly int $patch;

    #[ORM\Column(type: 'datetime_immutable')]
    private readonly \DateTimeImmutable $publishedAt;

    /**
     * @param Satisfies[] $satisfies informational compatibility only — never used to
     *                               resolve which Version is shown (ADR-0002)
     */
    public function __construct(
        #[ORM\ManyToOne(targetEntity: Document::class, inversedBy: 'versions')]
        #[ORM\JoinColumn(nullable: false)]
        private readonly Document $document,
        #[ORM\Column(type: 'string')]
        private readonly string $layer,
        #[ORM\Column(type: 'string')]
        private readonly string $semver,
        #[ORM\Column(type: 'document_content')]
        private readonly DocumentContent $content,
        #[ORM\Column(type: 'layout')]
        private readonly Layout $layout,
        #[ORM\ManyToOne(targetEntity: User::class)]
        #[ORM\JoinColumn(nullable: false)]
        private readonly User $publishedBy,
        #[ORM\Column(type: 'satisfies_list', nullable: true)]
        private readonly array $satisfies = [],
    ) {
        if ($layer !== $document->getLayer()) {
            throw new \InvalidArgumentException(sprintf(
                'Version layer "%s" must match its Document layer "%s".',
                $layer,
                $document->getLayer(),
            ));
        }

        [$this->major, $this->minor, $this->patch] = self::parseSemver($semver);
        $this->publishedAt = new \DateTimeImmutable();
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private static function parseSemver(string $semver): array
    {
        if (1 !== preg_match('/^(\d+)\.(\d+)\.(\d+)$/', $semver, $matches)) {
            throw new \InvalidArgumentException(sprintf('"%s" is not a valid semver (expected MAJOR.MINOR.PATCH).', $semver));
        }

        return [(int) $matches[1], (int) $matches[2], (int) $matches[3]];
    }

    public function getDocument(): Document
    {
        return $this->document;
    }

    public function getLayer(): string
    {
        return $this->layer;
    }

    public function getSemver(): string
    {
        return $this->semver;
    }

    /**
     * `@version` identity as `layer:semver` (e.g. "1:0.0.14").
     */
    public function getVersionIdentity(): string
    {
        return sprintf('%s:%s', $this->layer, $this->semver);
    }

    public function getMajor(): int
    {
        return $this->major;
    }

    public function getMinor(): int
    {
        return $this->minor;
    }

    public function getPatch(): int
    {
        return $this->patch;
    }

    public function getContent(): DocumentContent
    {
        return $this->content;
    }

    public function getLayout(): Layout
    {
        return $this->layout;
    }

    /**
     * @return Satisfies[]
     */
    public function getSatisfies(): array
    {
        return $this->satisfies;
    }

    public function getPublishedBy(): User
    {
        return $this->publishedBy;
    }

    public function getPublishedAt(): \DateTimeImmutable
    {
        return $this->publishedAt;
    }

    #[ORM\PreUpdate]
    public function rejectMutation(): never
    {
        throw new VersionIsImmutableException($this->getId());
    }
}

<?php

declare(strict_types=1);

namespace App\Entity;

use App\Entity\Concern\HasUuidId;
use App\ValueObject\DocumentContent;
use App\ValueObject\Layout;
use Doctrine\ORM\Mapping as ORM;

/**
 * The current, freely mutable working state of a Document — distinct from its
 * immutable, published Version history. See CONTEXT.md ("Draft").
 */
#[ORM\Entity]
#[ORM\Table(name: 'draft')]
class Draft
{
    use HasUuidId;

    public function __construct(
        #[ORM\OneToOne(targetEntity: Document::class, inversedBy: 'draft')]
        #[ORM\JoinColumn(nullable: false, unique: true)]
        private Document $document,
        #[ORM\Column(type: 'document_content')]
        private DocumentContent $content,
        #[ORM\Column(type: 'layout')]
        private Layout $layout,
        #[ORM\ManyToOne(targetEntity: User::class)]
        #[ORM\JoinColumn(nullable: false)]
        private User $updatedBy,
    ) {
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function getDocument(): Document
    {
        return $this->document;
    }

    public function getContent(): DocumentContent
    {
        return $this->content;
    }

    public function getLayout(): Layout
    {
        return $this->layout;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getUpdatedBy(): User
    {
        return $this->updatedBy;
    }

    public function update(DocumentContent $content, Layout $layout, User $updatedBy): void
    {
        $this->content = $content;
        $this->layout = $layout;
        $this->updatedBy = $updatedBy;
        $this->updatedAt = new \DateTimeImmutable();
    }
}

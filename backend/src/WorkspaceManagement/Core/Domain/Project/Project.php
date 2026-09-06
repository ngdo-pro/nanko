<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Project;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;

final class Project
{
    public function __construct(
        public readonly Id $id,
        public readonly OrganisationId $organisationId,
        private string $name,
        public readonly string $slug,
        public readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $updatedAt,
    ) {}

    public static function create(
        Id $id,
        OrganisationId $organisationId,
        string $name,
        string $slug,
    ): self {
        $now = new \DateTimeImmutable();

        return new self(
            id: $id,
            organisationId: $organisationId,
            name: $name,
            slug: $slug,
            createdAt: $now,
            updatedAt: $now,
        );
    }

    public function id(): Id
    {
        return $this->id;
    }

    public function organisationId(): OrganisationId
    {
        return $this->organisationId;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function createdAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function updatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function rename(string $newName): void
    {
        if ($this->name !== $newName) {
            $this->name = $newName;
            $this->updatedAt = new \DateTimeImmutable();
        }
    }
}

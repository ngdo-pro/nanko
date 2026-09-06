<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Organisation;

final class Organisation
{
    public function __construct(
        public readonly Id $id,
        private string $name,
        public readonly string $slug,
        public readonly bool $isPersonal,
        public readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $updatedAt,
    ) {}

    public static function create(Id $id, string $name, string $slug, bool $isPersonal = false): self
    {
        $now = new \DateTimeImmutable();

        return new self(
            id: $id,
            name: $name,
            slug: $slug,
            isPersonal: $isPersonal,
            createdAt: $now,
            updatedAt: $now,
        );
    }

    public function id(): Id
    {
        return $this->id;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function isPersonal(): bool
    {
        return $this->isPersonal;
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

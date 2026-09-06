<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document;

use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;

final class Document
{
    /**
     * @param array<string, mixed> $ast
     */
    public function __construct(
        public readonly Id $id,
        public readonly ProjectId $projectId,
        private string $name,
        public readonly string $slug,
        private Layer $layer,
        private string $sourceCode,
        private array $ast,
        public readonly \DateTimeImmutable $createdAt,
        private \DateTimeImmutable $updatedAt,
    ) {}

    /**
     * @param array<string, mixed> $ast
     */
    public static function create(
        Id $id,
        ProjectId $projectId,
        string $name,
        string $slug,
        Layer $layer,
        string $sourceCode,
        array $ast,
    ): self {
        $now = new \DateTimeImmutable();

        return new self(
            id: $id,
            projectId: $projectId,
            name: $name,
            slug: $slug,
            layer: $layer,
            sourceCode: $sourceCode,
            ast: $ast,
            createdAt: $now,
            updatedAt: $now,
        );
    }

    public function id(): Id
    {
        return $this->id;
    }

    public function projectId(): ProjectId
    {
        return $this->projectId;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function slug(): string
    {
        return $this->slug;
    }

    public function layer(): Layer
    {
        return $this->layer;
    }

    public function sourceCode(): string
    {
        return $this->sourceCode;
    }

    /**
     * @return array<string, mixed>
     */
    public function ast(): array
    {
        return $this->ast;
    }

    public function createdAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function updatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    /**
     * @param array<string, mixed> $newAst
     */
    public function updateSourceCode(string $newSourceCode, array $newAst): void
    {
        $this->sourceCode = $newSourceCode;
        $this->ast = $newAst;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function rename(string $newName): void
    {
        if ($this->name !== $newName) {
            $this->name = $newName;
            $this->updatedAt = new \DateTimeImmutable();
        }
    }

    public function changeLayer(Layer $newLayer): void
    {
        if (!$this->layer->equals($newLayer)) {
            $this->layer = $newLayer;
            $this->updatedAt = new \DateTimeImmutable();
        }
    }
}

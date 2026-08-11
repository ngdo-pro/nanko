<?php

declare(strict_types=1);

namespace App\Repository;

interface ProjectRepositoryInterface
{
    /**
     * @return array<string, mixed>
     *
     * @throws DuplicateSlugException
     */
    public function create(string $name, string $slug): array;

    /**
     * @return list<array<string, mixed>>
     */
    public function findAll(): array;
}

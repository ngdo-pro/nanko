<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

final class DoctrineProjectRepository implements ProjectRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function create(string $name, string $slug): array
    {
        try {
            /** @var array<string, mixed> $row */
            $row = $this->connection->fetchAssociative(
                'INSERT INTO project (name, slug) VALUES (:name, :slug)
                 RETURNING id, name, slug, created_at, updated_at',
                ['name' => $name, 'slug' => $slug],
            );
        } catch (UniqueConstraintViolationException) {
            throw new DuplicateSlugException($slug);
        }

        return $row;
    }

    public function findAll(): array
    {
        return $this->connection->fetchAllAssociative(
            'SELECT id, name, slug, created_at, updated_at FROM project ORDER BY created_at ASC',
        );
    }
}

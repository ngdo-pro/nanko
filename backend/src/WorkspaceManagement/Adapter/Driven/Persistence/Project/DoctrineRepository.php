<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driven\Persistence\Project;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\Project\Repository;
use Doctrine\DBAL\Connection;

final readonly class DoctrineRepository implements Repository
{
    public function __construct(private Connection $connection) {}

    public function findById(ProjectId $id): ?Project
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, organisation_id, name, slug, created_at, updated_at FROM project WHERE id = :id',
            ['id' => $id->toString()],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function findByOrganisationAndSlug(OrganisationId $organisationId, string $slug): ?Project
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, organisation_id, name, slug, created_at, updated_at
             FROM project
             WHERE organisation_id = :organisation_id AND slug = :slug',
            [
                'organisation_id' => $organisationId->toString(),
                'slug' => $slug,
            ],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * @return list<Project>
     */
    public function listByOrganisationId(OrganisationId $organisationId): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, organisation_id, name, slug, created_at, updated_at
             FROM project
             WHERE organisation_id = :organisation_id
             ORDER BY created_at ASC',
            ['organisation_id' => $organisationId->toString()],
        );

        return array_map(fn(array $row): Project => $this->hydrate($row), $rows);
    }

    public function save(Project $project): void
    {
        $this->connection->executeStatement(
            'INSERT INTO project (id, organisation_id, name, slug, created_at, updated_at)
             VALUES (:id, :organisation_id, :name, :slug, :created_at, :updated_at)
             ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 slug = EXCLUDED.slug,
                 updated_at = EXCLUDED.updated_at',
            [
                'id' => $project->id()->toString(),
                'organisation_id' => $project->organisationId()->toString(),
                'name' => $project->name(),
                'slug' => $project->slug(),
                'created_at' => $project->createdAt()->format(\DateTimeInterface::ATOM),
                'updated_at' => $project->updatedAt()->format(\DateTimeInterface::ATOM),
            ],
        );
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Project
    {
        $id = $row['id'];
        $organisationId = $row['organisation_id'];
        $name = $row['name'];
        $slug = $row['slug'];
        $createdAt = $row['created_at'];
        $updatedAt = $row['updated_at'];

        assert(is_string($id));
        assert(is_string($organisationId));
        assert(is_string($name));
        assert(is_string($slug));
        assert(is_string($createdAt));
        assert(is_string($updatedAt));

        return new Project(
            id: ProjectId::fromString($id),
            organisationId: OrganisationId::fromString($organisationId),
            name: $name,
            slug: $slug,
            createdAt: new \DateTimeImmutable($createdAt),
            updatedAt: new \DateTimeImmutable($updatedAt),
        );
    }
}

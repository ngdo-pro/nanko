<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driven\Persistence\Organisation;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use App\WorkspaceManagement\Core\Port\Organisation\Repository;
use Doctrine\DBAL\Connection;
use Symfony\Component\Uid\Uuid;

final readonly class DoctrineRepository implements Repository
{
    public function __construct(private Connection $connection) {}

    public function findById(OrganisationId $id): ?Organisation
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, name, slug, is_personal, created_at, updated_at FROM organisation WHERE id = :id',
            ['id' => $id->toString()],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function findBySlug(string $slug): ?Organisation
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, name, slug, is_personal, created_at, updated_at FROM organisation WHERE slug = :slug',
            ['slug' => $slug],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function findPersonalOrganisationForUser(Uuid $userId): ?Organisation
    {
        $row = $this->connection->fetchAssociative(
            'SELECT o.id, o.name, o.slug, o.is_personal, o.created_at, o.updated_at
             FROM organisation o
             INNER JOIN organisation_member m ON m.organisation_id = o.id
             WHERE m.user_id = :user_id AND o.is_personal = true
             LIMIT 1',
            ['user_id' => $userId->toRfc4122()],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * @return list<array{organisation: Organisation, role: string}>
     */
    public function listForUser(Uuid $userId): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT o.id, o.name, o.slug, o.is_personal, o.created_at, o.updated_at, m.role
             FROM organisation o
             INNER JOIN organisation_member m ON m.organisation_id = o.id
             WHERE m.user_id = :user_id
             ORDER BY o.is_personal DESC, o.created_at ASC',
            ['user_id' => $userId->toRfc4122()],
        );

        $result = [];
        foreach ($rows as $row) {
            $role = $row['role'];
            assert(is_string($role));
            $result[] = [
                'organisation' => $this->hydrate($row),
                'role' => $role,
            ];
        }

        return $result;
    }

    public function save(Organisation $organisation): void
    {
        $this->connection->executeStatement(
            'INSERT INTO organisation (id, name, slug, is_personal, created_at, updated_at)
             VALUES (:id, :name, :slug, :is_personal, :created_at, :updated_at)
             ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 slug = EXCLUDED.slug,
                 is_personal = EXCLUDED.is_personal,
                 updated_at = EXCLUDED.updated_at',
            [
                'id' => $organisation->id()->toString(),
                'name' => $organisation->name(),
                'slug' => $organisation->slug(),
                'is_personal' => $organisation->isPersonal(),
                'created_at' => $organisation->createdAt()->format(\DateTimeInterface::ATOM),
                'updated_at' => $organisation->updatedAt()->format(\DateTimeInterface::ATOM),
            ],
            [
                'is_personal' => \Doctrine\DBAL\ParameterType::BOOLEAN,
            ],
        );
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Organisation
    {
        $id = $row['id'];
        $name = $row['name'];
        $slug = $row['slug'];
        $isPersonal = $row['is_personal'];
        $createdAt = $row['created_at'];
        $updatedAt = $row['updated_at'];

        assert(is_string($id));
        assert(is_string($name));
        assert(is_string($slug));
        assert(is_string($createdAt));
        assert(is_string($updatedAt));

        return new Organisation(
            id: OrganisationId::fromString($id),
            name: $name,
            slug: $slug,
            isPersonal: (bool) $isPersonal,
            createdAt: new \DateTimeImmutable($createdAt),
            updatedAt: new \DateTimeImmutable($updatedAt),
        );
    }
}

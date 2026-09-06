<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driven\Persistence\OrganisationMember;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Role;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository;
use Doctrine\DBAL\Connection;
use Symfony\Component\Uid\Uuid;

final readonly class DoctrineRepository implements Repository
{
    public function __construct(private Connection $connection) {}

    public function findById(MemberId $id): ?OrganisationMember
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, organisation_id, user_id, role, created_at FROM organisation_member WHERE id = :id',
            ['id' => $id->toString()],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function findByOrganisationAndUser(OrganisationId $organisationId, Uuid $userId): ?OrganisationMember
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, organisation_id, user_id, role, created_at
             FROM organisation_member
             WHERE organisation_id = :organisation_id AND user_id = :user_id',
            [
                'organisation_id' => $organisationId->toString(),
                'user_id' => $userId->toRfc4122(),
            ],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * @return list<OrganisationMember>
     */
    public function listByOrganisationId(OrganisationId $organisationId): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, organisation_id, user_id, role, created_at
             FROM organisation_member
             WHERE organisation_id = :organisation_id
             ORDER BY created_at ASC',
            ['organisation_id' => $organisationId->toString()],
        );

        return array_map(fn(array $row): OrganisationMember => $this->hydrate($row), $rows);
    }

    public function save(OrganisationMember $member): void
    {
        $this->connection->executeStatement(
            'INSERT INTO organisation_member (id, organisation_id, user_id, role, created_at)
             VALUES (:id, :organisation_id, :user_id, :role, :created_at)
             ON CONFLICT (organisation_id, user_id) DO UPDATE SET
                 role = EXCLUDED.role',
            [
                'id' => $member->id()->toString(),
                'organisation_id' => $member->organisationId()->toString(),
                'user_id' => $member->userId()->toRfc4122(),
                'role' => $member->role()->value,
                'created_at' => $member->createdAt()->format(\DateTimeInterface::ATOM),
            ],
        );
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): OrganisationMember
    {
        $id = $row['id'];
        $organisationId = $row['organisation_id'];
        $userId = $row['user_id'];
        $role = $row['role'];
        $createdAt = $row['created_at'];

        assert(is_string($id));
        assert(is_string($organisationId));
        assert(is_string($userId));
        assert(is_string($role));
        assert(is_string($createdAt));

        return new OrganisationMember(
            id: MemberId::fromString($id),
            organisationId: OrganisationId::fromString($organisationId),
            userId: Uuid::fromString($userId),
            role: Role::from($role),
            createdAt: new \DateTimeImmutable($createdAt),
        );
    }
}

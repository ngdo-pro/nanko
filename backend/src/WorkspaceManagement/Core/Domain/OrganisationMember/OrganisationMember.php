<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\OrganisationMember;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use Symfony\Component\Uid\Uuid;

final class OrganisationMember
{
    public function __construct(
        public readonly Id $id,
        public readonly OrganisationId $organisationId,
        public readonly Uuid $userId,
        public readonly Role $role,
        public readonly \DateTimeImmutable $createdAt,
    ) {}

    public static function create(
        Id $id,
        OrganisationId $organisationId,
        Uuid $userId,
        Role $role = Role::OWNER,
    ): self {
        return new self(
            id: $id,
            organisationId: $organisationId,
            userId: $userId,
            role: $role,
            createdAt: new \DateTimeImmutable(),
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

    public function userId(): Uuid
    {
        return $this->userId;
    }

    public function role(): Role
    {
        return $this->role;
    }

    public function createdAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}

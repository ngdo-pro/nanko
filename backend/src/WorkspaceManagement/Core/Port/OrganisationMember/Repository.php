<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Port\OrganisationMember;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use Symfony\Component\Uid\Uuid;

interface Repository
{
    public function save(OrganisationMember $member): void;

    public function findById(MemberId $id): ?OrganisationMember;

    public function findByOrganisationAndUser(OrganisationId $organisationId, Uuid $userId): ?OrganisationMember;

    /**
     * @return list<OrganisationMember>
     */
    public function listByOrganisationId(OrganisationId $organisationId): array;
}

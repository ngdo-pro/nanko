<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Port\Organisation;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use Symfony\Component\Uid\Uuid;

interface Repository
{
    public function save(Organisation $organisation): void;

    public function findById(OrganisationId $id): ?Organisation;

    public function findBySlug(string $slug): ?Organisation;

    public function findPersonalOrganisationForUser(Uuid $userId): ?Organisation;

    /**
     * @return list<array{organisation: Organisation, role: string}>
     */
    public function listForUser(Uuid $userId): array;
}

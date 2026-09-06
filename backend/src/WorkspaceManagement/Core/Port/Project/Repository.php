<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Port\Project;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;

interface Repository
{
    public function save(Project $project): void;

    public function findById(ProjectId $id): ?Project;

    public function findByOrganisationAndSlug(OrganisationId $organisationId, string $slug): ?Project;

    /**
     * @return list<Project>
     */
    public function listByOrganisationId(OrganisationId $organisationId): array;
}

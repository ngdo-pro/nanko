<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\CreateProject;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use Symfony\Component\Uid\Uuid;

final readonly class CreateProjectCommand
{
    public function __construct(
        public OrganisationId $organisationId,
        public Uuid $userId,
        public string $name,
        public string $slug,
    ) {}
}
